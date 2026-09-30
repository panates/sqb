import { Insert } from '@sqb/builder';
import type { Adapter } from '@sqb/connect';
import { SqliteAdapter } from '@sqb/sqlite';
import path from 'path';
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

const sqliteAdapter = new SqliteAdapter();

/**
 * The shape of `@sqb/sqlite`'s internal `NativeDatabase` - narrowed to
 * just the synchronous methods this adapter needs. Not imported from
 * `@sqb/sqlite` directly: that package only exports its public `.` entry
 * point (the driver-selection internals aren't part of its public API),
 * and the runtime value behind `Adapter.Connection`'s `intlcon` is a
 * Node- or Bun-backed wrapper around the real driver, not the driver
 * itself either way.
 */
interface SqliteNativeStatement {
  run(params?: Record<string, any>): void;
  get(params?: Record<string, any>): Record<string, any> | undefined;
  all(params?: Record<string, any>): Record<string, any>[];
}
/** See {@link SqliteNativeStatement}. */
interface SqliteNativeDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteNativeStatement;
}

/** Quotes a (possibly schema-qualified, e.g. `"main.mytable"`) SQLite identifier so reserved words / mixed case / special characters in a migration task's `tableName` or row keys don't break the generated SQL. */
function quoteIdent(name: string): string {
  return name
    .split('.')
    .map(part => '"' + part.replace(/"/g, '""') + '"')
    .join('.');
}

/** `node:sqlite`/`bun:sqlite`-style named parameters must be bound with their sigil included in the object key (`":name"`, not `"name"`). */
function withColonKeys(params: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(params)) out[':' + k] = params[k];
  return out;
}

/**
 * {@link MigrationAdapter} for SQLite (via `@sqb/sqlite`'s `node:sqlite`/
 * `bun:sqlite` driver), structurally mirroring `PgMigrationAdapter` with
 * SQLite-specific differences: SQLite has no schema/catalog object to
 * create, so `infoSchema` is only ever used as a table-name prefix and
 * `$(schema)` resolves to `'main'`, the one always-present database name;
 * a script task runs in one call, since SQLite has neither MSSQL's
 * statement-order restriction nor Oracle's one-statement-per-call limit;
 * and both {@link lockSchema}/{@link unlockSchema} are no-ops, since
 * SQLite is an embedded, file-based engine with no server process to
 * arbitrate an advisory lock between clients - concurrent access is
 * instead handled at the file-lock level by SQLite itself.
 */
export class SqliteMigrationAdapter extends MigrationAdapter {
  declare protected _connection: SqliteNativeDatabase;
  declare protected _adapterConnection: Adapter.Connection;
  protected _infoSchema = '__migration';
  declare protected _migrationPackage: MigrationPackage;
  protected _version = 0;
  protected _status: MigrationStatus = MigrationStatus.idle;
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

  // SQLite has no schema/catalog object a migration package can create -
  // "main" is the only always-present database name, and $(schema) resolves
  // to it (see defaultVariables above) so scripts written for portability
  // across dialects still work. infoSchema is used only as a table-name
  // prefix, same rationale as OracleMigrationAdapter uses it for a schema
  // that's assumed to pre-exist rather than one this adapter can provision.
  get summaryTable(): string {
    return this.infoSchema + '_summary';
  }

  get eventTable(): string {
    return this.infoSchema + '_events';
  }

  /**
   * Connects via `@sqb/sqlite`, creates the bookkeeping tables if they
   * don't already exist, seeds the package's summary row if missing, and
   * returns a ready-to-use adapter with `version`/`status` refreshed from
   * it.
   *
   * @throws {Error} whatever the driver throws for a failed connection or setup statement - the connection is closed first if already open
   */
  static async create(
    options: StrictOmit<DbMigratorOptions, 'migrationPackage'> & {
      migrationPackage: MigrationPackage;
    },
  ): Promise<SqliteMigrationAdapter> {
    const adapterConnection = await sqliteAdapter.connect(options.connection);
    const connection = (adapterConnection as any)
      .intlcon as SqliteNativeDatabase;
    try {
      const adapter = new SqliteMigrationAdapter();
      adapter._connection = connection;
      adapter._adapterConnection = adapterConnection;
      adapter._migrationPackage = options.migrationPackage;
      adapter._infoSchema = options.infoSchema || '__migration';
      adapter.defaultVariables.owner = options.connection.user || '';

      connection.exec(`
CREATE TABLE IF NOT EXISTS ${quoteIdent(adapter.summaryTable)}
(
    package_name varchar(255) not null,
    status varchar(16) not null,
    current_version int not null default 0,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp null default null,
    CONSTRAINT pk_${adapter.summaryTable} PRIMARY KEY (package_name)
)`);

      connection.exec(`
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

      const rows = connection
        .prepare(
          `SELECT status FROM ${quoteIdent(adapter.summaryTable)} WHERE package_name = :packageName`,
        )
        .all(withColonKeys({ packageName: adapter.packageName }));
      if (!rows.length) {
        connection
          .prepare(
            `insert into ${quoteIdent(adapter.summaryTable)} (package_name, status) values (:packageName, :status)`,
          )
          .run(
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

  async close(): Promise<void> {
    await this._adapterConnection.close();
  }

  /** @throws {Error} if the package's summary row is somehow missing (should not happen once `create()` has run) */
  async refresh(): Promise<void> {
    const row = this._connection
      .prepare(
        `SELECT current_version, status FROM ${quoteIdent(this.summaryTable)} WHERE package_name = :packageName`,
      )
      .get(withColonKeys({ packageName: this.packageName }));
    if (!row) throw new Error('Summary record did not created');
    this._version = row.current_version;
    this._status = row.status;
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
      this._connection.prepare(sql).run(withColonKeys(params));
      if (info.status) this._status = info.status;
      if (info.version != null) this._version = info.version;
    }
  }

  async writeEvent(event: MigrationAdapter.Event): Promise<void> {
    const sql =
      `insert into ${quoteIdent(this.eventTable)} ` +
      '(package_name, version, event, event_time, title, message, filename, details) ' +
      'values (:packageName, :version, :event, CURRENT_TIMESTAMP, :title, :message, :filename, :details)';
    this._connection.prepare(sql).run(
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
   * SQLite has no restriction on statement order or count per call; a
   * custom task's function runs directly against the native database
   * handle; an insert-data task's rows are each turned into an `INSERT`
   * via `@sqb/builder`'s `Insert(...).generate({ dialect: 'sqlite' })` and
   * executed. A script-task error is annotated with the task's file
   * location before being rethrown.
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
        // SQLite has no restriction on statement order within a script (no
        // "CREATE TRIGGER must be first" rule like MSSQL, no one-statement-
        // per-call limit like Oracle), so the whole script runs in one call.
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
        this._connection.exec(sql);
      }
    }
  }

  backupDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  // SQLite is an embedded, file-based engine with no separate server
  // process to arbitrate an advisory lock between clients (no equivalent of
  // Postgres's pg_advisory_lock, MySQL/MariaDB's GET_LOCK, or MSSQL's
  // sp_getapplock) - concurrent access is instead handled at the file-lock
  // level by SQLite itself, so there's nothing meaningful to lock here.
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
