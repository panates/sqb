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

  /** Backs up the database before a migration run that includes a migration flagged `backup: true`. A no-op in every current adapter. */
  abstract backupDatabase(): Promise<void>;

  /** Restores the database from {@link backupDatabase}'s backup if a migration run fails partway through. A no-op in every current adapter. */
  abstract restoreDatabase(): Promise<void>;

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
