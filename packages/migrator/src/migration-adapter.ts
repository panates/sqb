import path from 'path';
import type {
  Migration,
  MigrationPackage,
  MigrationTask,
} from './migration-package.js';
import type { MigrationStatus } from './types.js';

/**
 * Base class for a dialect-specific migration backend (one concrete
 * subclass per `@sqb/connect` dialect - see `./adapters/*.ts`), driven by
 * {@link DbMigrator.execute}. A subclass is responsible for: provisioning
 * and maintaining its own bookkeeping tables (a package's tracked
 * version/status, and an append-only event log) in whatever way is
 * idiomatic for its dialect, running each {@link MigrationTask} kind
 * against the target database, and providing an advisory lock so
 * concurrent migration runs against the same package can't race.
 * Constructed only via each subclass's own static `create()` (there is no
 * public constructor on this base class), never directly.
 */
export abstract class MigrationAdapter {
  /** The migration package's name, as tracked in the bookkeeping table. */
  abstract readonly packageName: string;
  /** The package's last-recorded run status (see {@link MigrationStatus}). */
  abstract readonly status: MigrationStatus;
  /** The package's last-recorded applied migration version. */
  abstract readonly version: number;

  /** Closes the underlying database connection. */
  abstract close(): Promise<void>;

  /** Re-reads {@link status}/{@link version} from the bookkeeping table - used after acquiring the schema lock, in case another process advanced them while this one was waiting. */
  abstract refresh(): Promise<void>;

  /** Persists a new {@link status} and/or {@link version} to the bookkeeping table. */
  abstract update(info: {
    status?: MigrationStatus;
    version?: number;
  }): Promise<void>;

  /** Appends one entry to the migration event log, recording a task's start, success, or failure. */
  abstract writeEvent(event: MigrationAdapter.Event): Promise<void>;

  /** Runs one {@link MigrationTask} (a SQL script, a batch of row inserts, or a custom function) against the target database, with `variables` available for `$(name)` substitution in SQL-script tasks. */
  abstract executeTask(
    migrationPackage: MigrationPackage,
    migration: Migration,
    task: MigrationTask,
    variables: Record<string, any>,
  ): Promise<void>;

  /** Acquires an advisory lock (mechanism varies by dialect - see each subclass) so a concurrent migration run against the same package waits rather than racing on the bookkeeping tables. */
  abstract lockSchema(): Promise<void>;

  /** Releases the lock acquired by {@link lockSchema}. */
  abstract unlockSchema(): Promise<void>;

  /**
   * Whether this adapter can run migrations inside a transaction (see
   * `DbMigratorOptions.transaction`): the dialect must support
   * transactional DDL, and the adapter must implement
   * {@link startTransaction}/{@link commit}/{@link rollback}. `false` here,
   * overridden by the adapters that can.
   */
  get supportsTransactions(): boolean {
    return false;
  }

  /**
   * Begins a transaction on the adapter's connection. Only called when
   * {@link supportsTransactions} is `true`.
   *
   * @throws {Error} by default, for an adapter without transaction support.
   */
  startTransaction(): Promise<void> {
    return Promise.reject(this._noTransactionSupport());
  }

  /** Commits the transaction begun by {@link startTransaction}. */
  commit(): Promise<void> {
    return Promise.reject(this._noTransactionSupport());
  }

  /** Rolls back the transaction begun by {@link startTransaction}. */
  rollback(): Promise<void> {
    return Promise.reject(this._noTransactionSupport());
  }

  /**
   * Finds, in a SQL script about to run inside a transaction, the first
   * statement the dialect refuses to run in a transaction block (for
   * PostgreSQL: `CREATE INDEX CONCURRENTLY`, `VACUUM`, `CREATE DATABASE`,
   * ...), or a transaction-control statement that would cut the run's own
   * transaction short. Returns that statement's text, or `undefined` if
   * the script is fine. Nothing is flagged by default; adapters with
   * transaction support override this.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findNonTransactionalStatement(script: string): string | undefined {
    return undefined;
  }

  /**
   * Throws if `script` holds a statement that cannot run inside a
   * transaction block (see {@link findNonTransactionalStatement}), naming
   * the task and its file.
   *
   * @throws {Error} naming the task, its file and the offending statement
   */
  assertTransactionalScript(
    script: string,
    task: MigrationTask,
    migrationPackage: MigrationPackage,
  ): void {
    const statement = this.findNonTransactionalStatement(script);
    if (!statement) return;
    let msg = `Task "${task.title}"`;
    if (task.filename)
      msg +=
        ' (' + path.relative(migrationPackage.baseDir, task.filename) + ')';
    throw new Error(
      msg +
        ' has a statement that cannot run inside a transaction block: ' +
        JSON.stringify(statement) +
        ". Run with transaction: 'none' to apply it.",
    );
  }

  /**
   * Backs up the database before a migration run that includes a migration
   * flagged `backup: true`. No adapter implements a backup today, so this
   * rejects rather than let the flag pass as a no-op; a transactional run
   * (`DbMigratorOptions.transaction`) is the way to make a failed run
   * leave no trace.
   *
   * @throws {Error} always, unless overridden by an adapter that can back up its database.
   */
  backupDatabase(): Promise<void> {
    return Promise.reject(
      new Error(
        `Database backup is not supported by ${this.constructor.name}; ` +
          "run with transaction: 'run' for a run that leaves no trace when it fails",
      ),
    );
  }

  /** Restores the database from {@link backupDatabase}'s backup if a migration run fails partway through. Rejects by default, like {@link backupDatabase}. */
  restoreDatabase(): Promise<void> {
    return Promise.reject(
      new Error(
        `Database restore is not supported by ${this.constructor.name}`,
      ),
    );
  }

  private _noTransactionSupport(): Error {
    return new Error(
      `Transactional migration runs are not supported by ${this.constructor.name}`,
    );
  }

  /** Substitutes every `$(name)` reference in `text` with `variables[name]`, leaving a reference with no matching variable untouched. */
  protected replaceVariables(
    text: string,
    variables: Record<string, string>,
  ): string {
    return text.replace(
      /(\$\((\w+)\))/g,
      (s, ...args: string[]) => variables[args[1]] || s,
    );
  }
}

export namespace MigrationAdapter {
  /** What happened to a migration task, as recorded by {@link MigrationAdapter.writeEvent}. */
  export enum EventKind {
    started = 'started',
    success = 'success',
    error = 'error',
  }

  /** One entry in the migration event log. */
  export interface Event {
    event: EventKind;
    version: number;
    message: string;
    title?: string;
    filename?: string;
    details?: string;
  }
}
