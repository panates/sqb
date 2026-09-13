import { Insert } from '@sqb/builder';
import { MssqlAdapter } from '@sqb/mssql';
import sql, {
  type ConnectionPool,
  type Request,
  type Transaction,
} from 'mssql';
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
import { splitMssqlScript } from '../utils/split-mssql-script.js';

const mssqlAdapter = new MssqlAdapter();

/** Quotes a (possibly schema-qualified) T-SQL `[bracketed]` identifier so reserved words / mixed case / special characters in a migration task's `tableName` or row keys don't break the generated SQL. */
function quoteIdent(name: string): string {
  return name
    .split('.')
    .map(part => '[' + part.replace(/]/g, ']]') + ']')
    .join('.');
}

/** Binds each entry of `params` as a named `mssql` request input. */
function bindParams(request: Request, params: Record<string, any>) {
  for (const k of Object.keys(params)) request.input(k, params[k]);
}

/**
 * {@link MigrationAdapter} for Microsoft SQL Server, structurally
 * mirroring `PgMigrationAdapter` with T-SQL-specific differences:
 * `infoSchema` maps to a real schema (created via `EXEC('CREATE SCHEMA
 * ...')` wrapped in dynamic SQL, since `CREATE SCHEMA` must be the first
 * statement in its own batch); the event table's `id` uses a native
 * `IDENTITY` column rather than a sequence+trigger; a script task is split
 * into `GO`-separated batches via {@link splitMssqlScript} before running
 * (T-SQL requires `CREATE TRIGGER`/`PROCEDURE`/`FUNCTION`/`VIEW` to be the
 * first statement in their batch); and the schema lock is held by keeping
 * a dedicated transaction open for the duration of the migration run (see
 * {@link lockSchema}), rather than a session-scoped advisory lock, since
 * T-SQL DDL - unlike MySQL/Oracle - does not implicitly commit.
 */
export class MssqlMigrationAdapter extends MigrationAdapter {
  declare protected _connection: ConnectionPool;
  protected _infoSchema = '__migration';
  declare protected _migrationPackage: MigrationPackage;
  protected _version = 0;
  protected _status: MigrationStatus = MigrationStatus.idle;
  protected _lockTransaction?: Transaction;
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
   * Connects, creates `infoSchema` and the bookkeeping tables if they
   * don't already exist, seeds the package's summary row if missing, and
   * returns a ready-to-use adapter with `version`/`status` refreshed from
   * it.
   *
   * @throws {Error} whatever the driver throws for a failed connection or setup query - the connection is closed first if already open
   */
  static async create(
    options: StrictOmit<DbMigratorOptions, 'migrationPackage'> & {
      migrationPackage: MigrationPackage;
    },
  ): Promise<MssqlMigrationAdapter> {
    const connection = ((await mssqlAdapter.connect(options.connection)) as any)
      .intlcon as ConnectionPool;
    try {
      const adapter = new MssqlMigrationAdapter();
      adapter._connection = connection;
      adapter._migrationPackage = options.migrationPackage;
      adapter._infoSchema = options.infoSchema || '__migration';

      let schema = options.connection.schema;
      if (!schema) {
        const r = await connection
          .request()
          .query<any>('SELECT SCHEMA_NAME() AS s');
        schema = r.recordset[0]?.s || '';
      }
      adapter.defaultVariables.schema = schema || '';
      adapter.defaultVariables.owner = options.connection.user || '';

      // Unlike Oracle (where a schema is a user and provisioning one is a
      // DBA-level operation), a SQL Server schema is a plain namespace any
      // connecting user with the right permission can create - mirrors
      // Postgres/MySQL. CREATE SCHEMA must be the first statement in its
      // batch, so it's wrapped in EXEC() dynamic SQL to run inside the
      // surrounding IF block instead.
      await connection.request().query(`
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = '${adapter.infoSchema.replace(/'/g, "''")}')
BEGIN
  EXEC('CREATE SCHEMA ${quoteIdent(adapter.infoSchema).replace(/'/g, "''")}');
END`);

      await connection.request().query(`
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'${adapter.summaryTableFull}') AND type = 'U')
BEGIN
  CREATE TABLE ${adapter.summaryTableFull}
  (
      package_name varchar(255) not null,
      status varchar(16) not null,
      current_version int not null default 0,
      created_at datetime2 not null default current_timestamp,
      updated_at datetime2 null,
      CONSTRAINT pk_${adapter.summaryTable} PRIMARY KEY (package_name)
  );
END`);

      // Auto-increment is a native column attribute (IDENTITY) in SQL
      // Server - no sequence/trigger emulation needed, unlike Oracle.
      await connection.request().query(`
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'${adapter.eventTableFull}') AND type = 'U')
BEGIN
  CREATE TABLE ${adapter.eventTableFull}
  (
      id int identity(1,1) not null,
      package_name varchar(255) not null,
      version int not null default 0,
      event varchar(16) not null,
      event_time datetime2 not null,
      title varchar(1024),
      message varchar(max) not null,
      filename varchar(1024),
      details varchar(max),
      CONSTRAINT pk_${adapter.eventTable} PRIMARY KEY (id)
  );
END`);

      const existingReq = connection.request();
      bindParams(existingReq, { packageName: adapter.packageName });
      const existing = await existingReq.query<any>(
        `SELECT status FROM ${adapter.summaryTableFull} WHERE package_name = @packageName`,
      );
      if (!existing.recordset.length) {
        const insertReq = connection.request();
        bindParams(insertReq, {
          packageName: adapter.packageName,
          status: MigrationStatus.idle,
        });
        await insertReq.query(
          `insert into ${adapter.summaryTableFull} (package_name, status) values (@packageName, @status)`,
        );
      }

      await adapter.refresh();
      return adapter;
    } catch (e) {
      await connection.close();
      throw e;
    }
  }

  /** Closes the underlying connection, first rolling back the lock transaction (see {@link lockSchema}) if the migration run never got as far as `unlockSchema()`. */
  async close(): Promise<void> {
    if (this._lockTransaction) {
      const tx = this._lockTransaction;
      this._lockTransaction = undefined;
      await tx.rollback().catch(() => {});
    }
    await this._connection.close();
  }

  /** @throws {Error} if the package's summary row is somehow missing (should not happen once `create()` has run) */
  async refresh(): Promise<void> {
    const req = this._connection.request();
    bindParams(req, { packageName: this.packageName });
    const r = await req.query<any>(
      `SELECT current_version, status FROM ${this.summaryTableFull} WHERE package_name = @packageName`,
    );
    const row = r.recordset[0];
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
      sets.push('status = @status');
      params.status = info.status;
    }
    if (info.version != null && info.version !== this.version) {
      sets.push('current_version = @version');
      params.version = info.version;
    }
    if (sets.length) {
      const req = this._connection.request();
      bindParams(req, params);
      const sqlText =
        `update ${this.summaryTableFull} set updated_at = current_timestamp, ` +
        sets.join(', ') +
        ` where package_name = @packageName`;
      await req.query(sqlText);
      if (info.status) this._status = info.status;
      if (info.version != null) this._version = info.version;
    }
  }

  async writeEvent(event: MigrationAdapter.Event): Promise<void> {
    const req = this._connection.request();
    bindParams(req, {
      packageName: this.packageName,
      version: event.version,
      event: event.event,
      title: event.title,
      message: event.message,
      filename: event.filename,
      details: event.details,
    });
    const sqlText =
      `insert into ${this.eventTableFull} ` +
      '(package_name, version, event, event_time, title, message, filename, details) ' +
      'values (@packageName, @version, @event, CURRENT_TIMESTAMP, @title, @message, @filename, @details)';
    await req.query(sqlText);
  }

  /**
   * Runs one task: an SQL-script task's script (resolved from a function
   * if needed, then `$(name)`-substituted) is split into `GO`-separated
   * batches via {@link splitMssqlScript} and each run with
   * `Request#batch()`; a custom task's function runs directly against the
   * raw `mssql` connection pool; an insert-data task's rows are each
   * turned into an `INSERT` via `@sqb/builder`'s `Insert(...).generate({
   * dialect: 'mssql' })` and executed. A script-task error is annotated
   * with the task's file location before being rethrown.
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
        // T-SQL requires CREATE TRIGGER/PROCEDURE/FUNCTION/VIEW to be the
        // first statement in their batch, so a script mixing e.g. a CREATE
        // TABLE with a CREATE TRIGGER needs a "GO" separator between them,
        // same as sqlcmd/SSMS - see split-mssql-script.ts.
        for (const batch of splitMssqlScript(script)) {
          await this._connection.request().batch(batch);
        }
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
        const { sql: insertSql } = Insert(tableName, row).generate({
          dialect: 'mssql',
        });
        await this._connection.request().batch(insertSql);
      }
    }
  }

  backupDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Advisory lock via sp_getapplock, keyed by infoSchema + package name.
   * Unlike MySQL/Oracle, SQL Server DDL does not implicitly commit, so a
   * transaction-scoped app lock (@LockOwner='Transaction') works and needs
   * no special grant: the lock is held for as long as the dedicated
   * transaction opened here stays open, and is released automatically when
   * it's committed in unlockSchema() (or rolled back in close(), if the
   * migration run never got that far).
   */
  async lockSchema(): Promise<void> {
    const tx = new sql.Transaction(this._connection);
    await tx.begin();
    this._lockTransaction = tx;
    const req = tx.request();
    req.input('Resource', sql.VarChar(255), this._lockName());
    req.input('LockMode', sql.VarChar(32), 'Exclusive');
    req.input('LockOwner', sql.VarChar(32), 'Transaction');
    req.input('LockTimeout', sql.Int, -1);
    await req.execute('sp_getapplock');
    // Another process may have advanced the tracked version while we were
    // waiting for the lock - re-read it now that we hold it.
    await this.refresh();
  }

  restoreDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /** Commits the lock transaction opened by {@link lockSchema}, releasing the app lock along with it. A no-op if the lock was never acquired. */
  async unlockSchema(): Promise<void> {
    if (!this._lockTransaction) return;
    const tx = this._lockTransaction;
    this._lockTransaction = undefined;
    await tx.commit();
  }

  // sp_getapplock's @Resource parameter is capped at 255 characters.
  private _lockName(): string {
    return (this.infoSchema + '.' + this.packageName).slice(0, 255);
  }
}
