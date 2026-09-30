import { Insert } from '@sqb/builder';
import { MysqlAdapter } from '@sqb/mysql';
import type { Connection as MysqlDriverConnection } from 'mysql2/promise';
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

const mysqlAdapter = new MysqlAdapter();

/** Quotes a (possibly schema-qualified) MySQL identifier so reserved words / mixed case / special characters in a migration task's `tableName` or row keys don't break the generated SQL. */
function quoteIdent(name: string): string {
  return name
    .split('.')
    .map(part => '`' + part.replace(/`/g, '``') + '`')
    .join('.');
}

/**
 * {@link MigrationAdapter} for MySQL, structurally mirroring
 * `PgMigrationAdapter` with MySQL-specific differences: `infoSchema` maps
 * to a real `CREATE SCHEMA` (a MySQL database, not a DBA-provisioned user
 * like Oracle); the event table's `id` uses a native `AUTO_INCREMENT`
 * column rather than a sequence+trigger; and the connection is opened with
 * `multipleStatements: true` so a script task (which may contain several
 * statements, e.g. a `CREATE TABLE` followed by a `CREATE TRIGGER` with
 * its own internal `;`s) still runs in one call - the server's own parser
 * correctly treats a trigger/procedure body as one statement, so no
 * script-splitting like Oracle is needed.
 */
export class MysqlMigrationAdapter extends MigrationAdapter {
  declare protected _connection: MysqlDriverConnection;
  protected _infoSchema = '__migration';
  declare protected _migrationPackage: MigrationPackage;
  protected _version = 0;
  protected _status: MigrationStatus = MigrationStatus.idle;
  protected defaultVariables = {
    tablespace: '',
    schema: '',
    owner: '',
  };
  readonly summaryTable = 'migration_summary';
  readonly eventTable = 'migration_events';

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

  get summaryTableFull(): string {
    return quoteIdent(this.infoSchema) + '.' + this.summaryTable;
  }

  get eventTableFull(): string {
    return quoteIdent(this.infoSchema) + '.' + this.eventTable;
  }

  /**
   * Connects (with `multipleStatements` enabled), creates `infoSchema` and
   * the bookkeeping tables if they don't already exist, seeds the
   * package's summary row if missing, and returns a ready-to-use adapter
   * with `version`/`status` refreshed from it.
   *
   * @throws {Error} whatever the driver throws for a failed connection or setup query - the connection is closed first if already open
   */
  static async create(
    options: StrictOmit<DbMigratorOptions, 'migrationPackage'> & {
      migrationPackage: MigrationPackage;
    },
  ): Promise<MysqlMigrationAdapter> {
    // A migration script may contain several statements (e.g. a CREATE
    // TABLE followed by a CREATE TRIGGER whose body has its own internal
    // ";"s) - mysql2 only runs more than one statement per call when
    // multipleStatements is enabled at connection time. The server's own
    // parser (not the mysql CLI's client-side DELIMITER convention) is
    // what correctly treats a trigger/procedure body as one statement, so
    // no script-splitting is needed here, unlike Oracle.
    const connection = (
      (await mysqlAdapter.connect({
        ...options.connection,
        driverOptions: {
          ...options.connection.driverOptions,
          multipleStatements: true,
        },
      })) as any
    ).intlcon as MysqlDriverConnection;
    try {
      const adapter = new MysqlMigrationAdapter();
      adapter._connection = connection;
      adapter._migrationPackage = options.migrationPackage;
      adapter._infoSchema = options.infoSchema || '__migration';

      let schema = options.connection.schema;
      if (!schema) {
        const [rows] = await connection.query<any>('SELECT DATABASE() AS db');
        schema = rows[0]?.db || '';
      }
      adapter.defaultVariables.schema = schema || '';
      adapter.defaultVariables.owner = options.connection.user || '';

      // Unlike Oracle (where a schema is a user and provisioning one is a
      // DBA-level operation), MySQL's CREATE SCHEMA is just CREATE
      // DATABASE - a database-level object most connecting users can
      // already create, so this mirrors Postgres's behavior instead.
      await connection.query(
        `CREATE SCHEMA IF NOT EXISTS ${quoteIdent(adapter.infoSchema)}`,
      );

      await connection.query(`
CREATE TABLE IF NOT EXISTS ${adapter.summaryTableFull}
(
    package_name varchar(255) not null,
    status varchar(16) not null,
    current_version int not null default 0,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp null default null,
    CONSTRAINT pk_${adapter.summaryTable} PRIMARY KEY (package_name)
)`);

      // Auto-increment is a native column attribute in MySQL - no
      // sequence/trigger emulation needed, unlike Oracle.
      await connection.query(`
CREATE TABLE IF NOT EXISTS ${adapter.eventTableFull}
(
    id int not null AUTO_INCREMENT,
    package_name varchar(255) not null,
    version int not null default 0,
    event varchar(16) not null,
    event_time timestamp not null,
    title varchar(1024),
    message text not null,
    filename varchar(1024),
    details text,
    CONSTRAINT pk_${adapter.eventTable} PRIMARY KEY (id)
)`);

      const [existing] = await connection.query<any>(
        `SELECT status FROM ${adapter.summaryTableFull} WHERE package_name = :packageName`,
        { packageName: adapter.packageName },
      );
      if (!existing.length) {
        await connection.query(
          `insert into ${adapter.summaryTableFull} (package_name, status) values (:packageName, :status)`,
          { packageName: adapter.packageName, status: MigrationStatus.idle },
        );
      }

      await adapter.refresh();
      return adapter;
    } catch (e) {
      await connection.end();
      throw e;
    }
  }

  async close(): Promise<void> {
    await this._connection.end();
  }

  /** @throws {Error} if the package's summary row is somehow missing (should not happen once `create()` has run) */
  async refresh(): Promise<void> {
    const [rows] = await this._connection.query<any>(
      `SELECT current_version, status FROM ${this.summaryTableFull} WHERE package_name = :packageName`,
      { packageName: this.packageName },
    );
    const row = rows[0];
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
        `update ${this.summaryTableFull} set updated_at = current_timestamp, ` +
        sets.join(', ') +
        ` where package_name = :packageName`;
      await this._connection.query(sql, params);
      if (info.status) this._status = info.status;
      if (info.version != null) this._version = info.version;
    }
  }

  async writeEvent(event: MigrationAdapter.Event): Promise<void> {
    const sql =
      `insert into ${this.eventTableFull} ` +
      '(package_name, version, event, event_time, title, message, filename, details) ' +
      'values (:packageName, :version, :event, CURRENT_TIMESTAMP, :title, :message, :filename, :details)';
    await this._connection.query(sql, {
      packageName: this.packageName,
      version: event.version,
      event: event.event,
      title: event.title,
      message: event.message,
      filename: event.filename,
      details: event.details,
    });
  }

  /**
   * Runs one task: an SQL-script task's script (resolved from a function
   * if needed, then `$(name)`-substituted) executes in one call, thanks to
   * `multipleStatements` on the connection; a custom task's function runs
   * directly against the raw `mysql2` connection; an insert-data task's
   * rows are each turned into an `INSERT` via `@sqb/builder`'s
   * `Insert(...).generate({ dialect: 'mysql' })` and executed. A
   * script-task error is annotated with the task's file location before
   * being rethrown.
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
        await this._connection.query(script);
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
        const { sql } = Insert(tableName, row).generate({ dialect: 'mysql' });
        await this._connection.query(sql);
      }
    }
  }

  backupDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Advisory lock via GET_LOCK(), keyed by infoSchema + package name.
   * Session-scoped (unlike a transaction-held row lock), so it isn't
   * released by a migration's DDL - MySQL, like Oracle, implicitly commits
   * on CREATE/ALTER/DROP TABLE, which would otherwise release a
   * transaction-held lock the instant a migration's first DDL statement
   * ran. Unlike DBMS_LOCK on Oracle, GET_LOCK needs no special grant.
   */
  async lockSchema(): Promise<void> {
    await this._connection.query('SELECT GET_LOCK(:name, -1)', {
      name: this._lockName(),
    });
    // Another process may have advanced the tracked version while we were
    // waiting for the lock - re-read it now that we hold it.
    await this.refresh();
  }

  restoreDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async unlockSchema(): Promise<void> {
    await this._connection.query('SELECT RELEASE_LOCK(:name)', {
      name: this._lockName(),
    });
  }

  // GET_LOCK() names are capped at 64 characters.
  private _lockName(): string {
    return (this.infoSchema + '.' + this.packageName).slice(0, 64);
  }
}
