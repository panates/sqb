import { Insert } from '@sqb/builder';
import type { Adapter } from '@sqb/connect';
import { SqljsAdapter } from '@sqb/sqljs';
import fs from 'fs/promises';
import path from 'path';
import type { Database } from 'sql.js';
import type { StrictOmit } from 'ts-gems';
import type { DbMigratorOptions } from '../db-migrator.js';
import { MigrationAdapter } from '../migration-adapter.js';
import {
  isCustomMigrationTask,
  isInsertDataMigrationTask,
  isSqlScriptMigrationTask,
  type Migration,
  MigrationPackage,
  type MigrationTask,
} from '../migration-package.js';
import { MigrationStatus } from '../types.js';

const sqljsAdapter = new SqljsAdapter();

/** Quotes a (possibly schema-qualified, e.g. `"main.mytable"`) SQLite identifier so reserved words / mixed case / special characters in a migration task's `tableName` or row keys don't break the generated SQL. */
function quoteIdent(name: string): string {
  return name
    .split('.')
    .map(part => '"' + part.replace(/"/g, '""') + '"')
    .join('.');
}

/** `sql.js`-style named parameters must be bound with their sigil included in the object key (`":name"`, not `"name"`). */
function withColonKeys(params: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(params)) out[':' + k] = params[k];
  return out;
}

/**
 * {@link MigrationAdapter} for SQLite via the pure-WASM `@sqb/sqljs`
 * driver, structurally mirroring `SqliteMigrationAdapter` (SQLite has no
 * schema/catalog object to create, so `infoSchema` is only ever used as a
 * table-name prefix and `$(schema)` resolves to `'main'`; a script task
 * runs in one call; both {@link lockSchema}/{@link unlockSchema} are
 * no-ops, since there's no server process to arbitrate a lock between
 * clients) with one addition: `sql.js` loads a whole database file into
 * memory up front and never writes it back on its own, so for a
 * file-backed (non-`:memory:`) database, `close()` explicitly exports the
 * in-memory database and writes it back to disk - without that, every
 * migration applied in the run would be silently lost the moment the
 * process exits.
 */
export class SqljsMigrationAdapter extends MigrationAdapter {
  declare protected _connection: Database;
  declare protected _adapterConnection: Adapter.Connection;
  protected _infoSchema = '__migration';
  declare protected _migrationPackage: MigrationPackage;
  protected _version = 0;
  protected _status: MigrationStatus = MigrationStatus.idle;
  // Set only for a file-backed (non ":memory:") database - sql.js loads the
  // whole file into memory up front and never writes back on its own, so
  // this adapter persists the result itself once the migration run
  // finishes, otherwise every applied migration would be silently lost the
  // moment the process exits.
  protected _persistPath?: string;
  protected defaultVariables = {
    tablespace: '',
    schema: 'main',
    owner: '',
  };

  get packageName(): string {
    return this._migrationPackage.name;
  }

  get version(): number {
    return this._version;
  }

  get status(): MigrationStatus {
    return this._status;
  }

  get infoSchema(): string {
    return this._infoSchema;
  }

  // sql.js is the same embedded SQLite engine as @sqb/sqlite under the
  // hood, so the same reasoning applies: no schema/catalog object to
  // create, infoSchema is just a table-name prefix, $(schema) resolves to
  // "main".
  get summaryTable(): string {
    return this.infoSchema + '_summary';
  }

  get eventTable(): string {
    return this.infoSchema + '_events';
  }

  /**
   * Connects via `@sqb/sqljs`, records whether the database is file-backed
   * (so {@link close} knows whether to persist it), creates the
   * bookkeeping tables if they don't already exist, seeds the package's
   * summary row if missing, and returns a ready-to-use adapter with
   * `version`/`status` refreshed from it.
   *
   * @throws {Error} whatever the driver throws for a failed connection or setup statement - the connection is closed first if already open
   */
  static async create(
    options: StrictOmit<DbMigratorOptions, 'migrationPackage'> & {
      migrationPackage: MigrationPackage;
    },
  ): Promise<SqljsMigrationAdapter> {
    const adapterConnection = await sqljsAdapter.connect(options.connection);
    const connection = (adapterConnection as any).intlcon as Database;
    try {
      const adapter = new SqljsMigrationAdapter();
      adapter._connection = connection;
      adapter._adapterConnection = adapterConnection;
      adapter._migrationPackage = options.migrationPackage;
      adapter._infoSchema = options.infoSchema || '__migration';
      adapter.defaultVariables.owner = options.connection.user || '';

      const database = options.connection.database || '';
      const isMemory = /^:memory:(\w+)?$/.test(database);
      adapter._persistPath = isMemory ? undefined : path.resolve(database);

      connection.run(`
CREATE TABLE IF NOT EXISTS ${quoteIdent(adapter.summaryTable)}
(
    package_name varchar(255) not null,
    status varchar(16) not null,
    current_version int not null default 0,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp null default null,
    CONSTRAINT pk_${adapter.summaryTable} PRIMARY KEY (package_name)
)`);

      connection.run(`
CREATE TABLE IF NOT EXISTS ${quoteIdent(adapter.eventTable)}
(
    id integer primary key autoincrement,
    package_name varchar(255) not null,
    version int not null default 0,
    event varchar(16) not null,
    event_time timestamp not null,
    title varchar(1024),
    message text not null,
    filename varchar(1024),
    details text
)`);

      const existing = connection.exec(
        `SELECT status FROM ${quoteIdent(adapter.summaryTable)} WHERE package_name = :packageName`,
        withColonKeys({ packageName: adapter.packageName }),
      );
      if (!existing.length || !existing[0].values.length) {
        connection.run(
          `insert into ${quoteIdent(adapter.summaryTable)} (package_name, status) values (:packageName, :status)`,
          withColonKeys({
            packageName: adapter.packageName,
            status: MigrationStatus.idle,
          }),
        );
      }

      await adapter.refresh();
      return adapter;
    } catch (e) {
      await adapterConnection.close();
      throw e;
    }
  }

  /** For a file-backed database, exports the in-memory database and writes it back to `_persistPath` before closing - `sql.js` never persists changes on its own. A no-op export step for an in-memory database. */
  async close(): Promise<void> {
    if (this._persistPath) {
      const data = this._connection.export();
      await fs.writeFile(this._persistPath, data);
    }
    await this._adapterConnection.close();
  }

  /** @throws {Error} if the package's summary row is somehow missing (should not happen once `create()` has run) */
  async refresh(): Promise<void> {
    const result = this._connection.exec(
      `SELECT current_version, status FROM ${quoteIdent(this.summaryTable)} WHERE package_name = :packageName`,
      withColonKeys({ packageName: this.packageName }),
    );
    const row = result[0]?.values[0];
    if (!row) throw new Error('Summary record did not created');
    this._version = row[0] as number;
    this._status = row[1] as MigrationStatus;
  }

  async update(info: {
    status?: MigrationStatus;
    version?: number;
  }): Promise<void> {
    const sets: string[] = [];
    const params: Record<string, any> = { packageName: this.packageName };
    if (info.status && info.status !== this.status) {
      sets.push('status = :status');
      params.status = info.status;
    }
    if (info.version != null && info.version !== this.version) {
      sets.push('current_version = :version');
      params.version = info.version;
    }
    if (sets.length) {
      const sql =
        `update ${quoteIdent(this.summaryTable)} set updated_at = current_timestamp, ` +
        sets.join(', ') +
        ` where package_name = :packageName`;
      this._connection.run(sql, withColonKeys(params));
      if (info.status) this._status = info.status;
      if (info.version != null) this._version = info.version;
    }
  }

  async writeEvent(event: MigrationAdapter.Event): Promise<void> {
    const sql =
      `insert into ${quoteIdent(this.eventTable)} ` +
      '(package_name, version, event, event_time, title, message, filename, details) ' +
      'values (:packageName, :version, :event, CURRENT_TIMESTAMP, :title, :message, :filename, :details)';
    this._connection.run(
      sql,
      withColonKeys({
        packageName: this.packageName,
        version: event.version,
        event: event.event,
        title: event.title ?? null,
        message: event.message,
        filename: event.filename ?? null,
        details: event.details ?? null,
      }),
    );
  }

  /**
   * Runs one task: an SQL-script task's script (resolved from a function
   * if needed, then `$(name)`-substituted) executes in one call, since
   * `sql.js` has no restriction on statement order or count per call; a
   * custom task's function runs directly against the raw `sql.js`
   * `Database`; an insert-data task's rows are each turned into an
   * `INSERT` via `@sqb/builder`'s `Insert(...).generate({ dialect:
   * 'sqlite' })` and run. A script-task error is annotated with the
   * task's file location before being rethrown.
   */
  async executeTask(
    migrationPackage: MigrationPackage,
    migration: Migration,
    task: MigrationTask,
    variables: Record<string, any>,
  ): Promise<void> {
    variables = {
      ...this.defaultVariables,
      ...variables,
    };
    if (isSqlScriptMigrationTask(task)) {
      try {
        let script: string | undefined;
        if (typeof task.script === 'function') {
          script = await task.script({
            migrationPackage,
            migration,
            task,
            variables,
          });
        } else script = task.script;
        if (typeof script !== 'string') return;
        script = this.replaceVariables(script, variables);
        // Same reasoning as @sqb/migrator's SqliteMigrationAdapter: sql.js
        // has no statement-order or one-statement-per-call restriction, so
        // the whole script runs in one call.
        this._connection.exec(script);
      } catch (e: any) {
        let msg = `Error in task "${task.title}"`;
        if (task.filename)
          msg +=
            '\n at ' + path.relative(migrationPackage.baseDir, task.filename);
        e.message = msg + '\n\n' + e.message;
        throw e;
      }
      return;
    }

    if (isCustomMigrationTask(task)) {
      await task.fn(this._connection, this);
      return;
    }

    if (isInsertDataMigrationTask(task)) {
      const tableName = this.replaceVariables(task.tableName, variables);
      for (const row of task.rows) {
        const { sql } = Insert(tableName, row).generate({
          dialect: 'sqlite',
        });
        this._connection.run(sql);
      }
    }
  }

  backupDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  // Same reasoning as SqliteMigrationAdapter: an embedded, single-process
  // engine with no server to arbitrate an advisory lock between clients.
  lockSchema(): Promise<void> {
    return Promise.resolve(undefined);
  }

  restoreDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  unlockSchema(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
