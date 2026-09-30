import { Insert } from '@sqb/builder';
import { OraAdapter } from '@sqb/oracle';
import oracledb from 'oracledb';
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
import { splitOracleScript } from '../utils/split-oracle-script.js';

const oraAdapter = new OraAdapter();

/**
 * Wraps `sql` in a PL/SQL block that swallows `ORA-00955` ("name is
 * already used by an existing object") - the Oracle equivalent of `IF NOT
 * EXISTS`, which Oracle has no direct clause for on `CREATE TABLE`/
 * `SEQUENCE`/`INDEX`.
 */
function ifNotExistsGuard(sql: string): string {
  return `BEGIN
  EXECUTE IMMEDIATE '${sql.replace(/'/g, "''")}';
EXCEPTION
  WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF;
END;`;
}

/**
 * {@link MigrationAdapter} for Oracle Database, structurally mirroring
 * `PgMigrationAdapter` with Oracle-specific differences: `infoSchema` is
 * only ever used as a table-name prefix rather than a schema this adapter
 * creates - an Oracle schema *is* a user, and provisioning one is a
 * DBA-level operation deliberately left out of scope, so that schema/user
 * must already exist; `CREATE TABLE`/`SEQUENCE` are wrapped in
 * {@link ifNotExistsGuard} since Oracle has no `IF NOT EXISTS`; the event
 * table's auto-incrementing `id` is emulated with a sequence plus a
 * `BEFORE INSERT` trigger, since Oracle has no `AUTO_INCREMENT`/`serial`
 * column type; a script task is split into individual statements via
 * {@link splitOracleScript} before running (`oracledb`'s `execute()` runs
 * exactly one statement per call, unlike every other driver this package
 * supports); and the schema lock uses `DBMS_LOCK` (see {@link
 * lockSchema}), degrading to no locking at all if that package isn't
 * grantable in the target environment.
 */
export class OracleMigrationAdapter extends MigrationAdapter {
  declare protected _connection: oracledb.Connection;
  protected _infoSchemaPrefix = '';
  declare protected _migrationPackage: MigrationPackage;
  protected _version = 0;
  protected _status: MigrationStatus = MigrationStatus.idle;
  protected defaultVariables = {
    tablespace: 'USERS',
    schema: '',
    owner: '',
  };
  readonly summaryTable = 'MIGRATION_SUMMARY';
  readonly eventTable = 'MIGRATION_EVENTS';

  get packageName(): string {
    return this._migrationPackage.name;
  }

  get version(): number {
    return this._version;
  }

  get status(): MigrationStatus {
    return this._status;
  }

  // Unlike Postgres, Oracle has no separate "CREATE SCHEMA" concept - a
  // schema *is* a user, and provisioning one is a DBA-level operation this
  // adapter deliberately doesn't attempt. `infoSchema` (when given) is only
  // used as a table-name prefix; that schema/user must already exist.
  get infoSchemaPrefix(): string {
    return this._infoSchemaPrefix;
  }

  get summaryTableFull(): string {
    return this.infoSchemaPrefix + this.summaryTable;
  }

  get eventTableFull(): string {
    return this.infoSchemaPrefix + this.eventTable;
  }

  /**
   * Connects, creates the bookkeeping tables (and the event table's
   * id-generating sequence and trigger) if they don't already exist, seeds
   * the package's summary row if missing, and returns a ready-to-use
   * adapter with `version`/`status` refreshed from it.
   *
   * @throws {Error} whatever the driver throws for a failed connection or setup statement - the connection is closed first if already open
   */
  static async create(
    options: StrictOmit<DbMigratorOptions, 'migrationPackage'> & {
      migrationPackage: MigrationPackage;
    },
  ): Promise<OracleMigrationAdapter> {
    const connection = ((await oraAdapter.connect(options.connection)) as any)
      .intlcon as oracledb.Connection;
    try {
      const adapter = new OracleMigrationAdapter();
      adapter._connection = connection;
      adapter._migrationPackage = options.migrationPackage;
      adapter._infoSchemaPrefix = options.infoSchema
        ? options.infoSchema + '.'
        : '';

      const r = await connection.execute<any>(
        "select sys_context('userenv', 'current_schema') from dual",
        [],
        { autoCommit: true },
      );
      const currentSchema = r.rows?.[0]?.[0] || '';
      adapter.defaultVariables.schema =
        options.connection.schema || currentSchema;
      adapter.defaultVariables.owner = currentSchema;

      // Create summary table if not exists
      await connection.execute(
        ifNotExistsGuard(`
CREATE TABLE ${adapter.summaryTableFull}
(
    package_name varchar2(128) not null,
    status varchar2(16) not null,
    current_version integer default 0 not null,
    created_at timestamp default current_timestamp not null,
    updated_at timestamp,
    CONSTRAINT pk_${adapter.summaryTable} PRIMARY KEY (package_name)
)`),
      );

      // Create events table and its auto-increment sequence/trigger if not
      // exists - Oracle has no "serial"/auto-increment column type.
      await connection.execute(
        ifNotExistsGuard(`
CREATE TABLE ${adapter.eventTableFull}
(
    id integer not null,
    package_name varchar2(128) not null,
    version integer default 0 not null,
    event varchar2(16) not null,
    event_time timestamp not null,
    title varchar2(1024),
    message varchar2(4000) not null,
    filename varchar2(1024),
    details clob,
    CONSTRAINT pk_${adapter.eventTable} PRIMARY KEY (id)
)`),
      );
      await connection.execute(
        ifNotExistsGuard(
          `CREATE SEQUENCE ${adapter.eventTableFull}_seq START WITH 1`,
        ),
      );
      await connection.execute(`
CREATE OR REPLACE TRIGGER ${adapter.eventTableFull}_bi
BEFORE INSERT ON ${adapter.eventTableFull}
FOR EACH ROW
BEGIN
  IF :new.id IS NULL THEN
    SELECT ${adapter.eventTableFull}_seq.NEXTVAL INTO :new.id FROM dual;
  END IF;
END;`);

      // Insert summary record if not exists
      const existing = await connection.execute<any>(
        `SELECT status FROM ${adapter.summaryTableFull} WHERE package_name = :1`,
        [adapter.packageName],
      );
      if (!existing.rows?.length) {
        await connection.execute(
          `insert into ${adapter.summaryTableFull} (package_name, status) values (:1, :2)`,
          [adapter.packageName, MigrationStatus.idle],
          { autoCommit: true },
        );
      }

      await adapter.refresh();
      return adapter;
    } catch (e) {
      await connection.close();
      throw e;
    }
  }

  async close(): Promise<void> {
    await this._connection.close();
  }

  /** @throws {Error} if the package's summary row is somehow missing (should not happen once `create()` has run) */
  async refresh(): Promise<void> {
    const r = await this._connection.execute<any>(
      `SELECT current_version, status FROM ${this.summaryTableFull} WHERE package_name = :1`,
      [this.packageName],
    );
    const row = r.rows?.[0];
    if (!row) throw new Error('Summary record did not created');
    this._version = row[0];
    this._status = row[1];
  }

  async update(info: {
    status?: MigrationStatus;
    version?: number;
  }): Promise<void> {
    let sql = '';
    const params: any[] = [];
    if (info.status && info.status !== this.status) {
      params.push(info.status);
      sql += ',\n  status = :' + params.length;
    }
    if (info.version != null && info.version !== this.version) {
      params.push(info.version);
      sql += ',\n  current_version = :' + params.length;
    }
    if (sql) {
      params.push(this.packageName);
      sql =
        `update ${this.summaryTableFull} set updated_at = current_timestamp` +
        sql +
        `\n where package_name = :` +
        params.length;
      await this._connection.execute(sql, params, { autoCommit: true });
      if (info.status) this._status = info.status;
      if (info.version != null) this._version = info.version;
    }
  }

  async writeEvent(event: MigrationAdapter.Event): Promise<void> {
    const sql =
      `insert into ${this.eventTableFull} ` +
      '(package_name, version, event, event_time, title, message, filename, details) ' +
      'values (:1, :2, :3, CURRENT_TIMESTAMP, :4, :5, :6, :7)';
    await this._connection.execute(
      sql,
      [
        this.packageName,
        event.version,
        event.event,
        event.title,
        event.message,
        event.filename,
        event.details,
      ],
      { autoCommit: true },
    );
  }

  /**
   * Runs one task: an SQL-script task's script (resolved from a function
   * if needed, then `$(name)`-substituted) is split into individual
   * statements via {@link splitOracleScript} and each executed with
   * `autoCommit: true` (Oracle DDL implicitly commits anyway, and there is
   * no ambient transaction spanning the whole migration run); a custom
   * task's function runs directly against the raw `oracledb` connection;
   * an insert-data task's rows are each turned into an `INSERT` via
   * `@sqb/builder`'s `Insert(...).generate({ dialect: 'oracle' })` and
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
      let script: string | undefined;
      try {
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
        for (const stmt of splitOracleScript(script)) {
          await this._connection.execute(stmt, [], { autoCommit: true });
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
        const { sql } = Insert(tableName, row).generate({ dialect: 'oracle' });
        await this._connection.execute(sql, [], { autoCommit: true });
      }
    }
  }

  backupDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Best-effort advisory lock via DBMS_LOCK, keyed by a hash of the info
   * schema + package name. Unlike a transaction-held row lock, this isn't
   * released by a migration's DDL (Oracle DDL always implicitly commits,
   * which would otherwise release the lock the instant the first CREATE/
   * ALTER in a migration ran). If DBMS_LOCK isn't grantable in this
   * environment (ORA-01031 / PLS-00201), degrades to no locking rather than
   * failing the whole migration run.
   */
  async lockSchema(): Promise<void> {
    try {
      await this._connection.execute(
        `DECLARE
           l_result INTEGER;
         BEGIN
           l_result := DBMS_LOCK.REQUEST(
             id => DBMS_UTILITY.GET_HASH_VALUE(:lockName, 0, 1073741824),
             lockmode => DBMS_LOCK.X_MODE,
             timeout => DBMS_LOCK.MAXWAIT,
             release_on_commit => FALSE
           );
           IF l_result != 0 THEN
             RAISE_APPLICATION_ERROR(-20000, 'DBMS_LOCK.REQUEST failed with code ' || l_result);
           END IF;
         END;`,
        { lockName: this._lockName() },
      );
    } catch (e: any) {
      if (!/ORA-01031|PLS-00201/.test(e.message)) throw e;
    }
    // Another process may have advanced the tracked version while we were
    // waiting for the lock - re-read it now that we hold it.
    await this.refresh();
  }

  restoreDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /** Releases the lock acquired by {@link lockSchema} via `DBMS_LOCK.RELEASE`, again swallowing an insufficient-privilege error rather than throwing (matching {@link lockSchema}'s degrade-to-no-locking behavior). */
  async unlockSchema(): Promise<void> {
    try {
      await this._connection.execute(
        `DECLARE
           l_result INTEGER;
         BEGIN
           l_result := DBMS_LOCK.RELEASE(id => DBMS_UTILITY.GET_HASH_VALUE(:lockName, 0, 1073741824));
         END;`,
        { lockName: this._lockName() },
      );
    } catch (e: any) {
      if (!/ORA-01031|PLS-00201/.test(e.message)) throw e;
    }
  }

  private _lockName(): string {
    return this.infoSchemaPrefix + this.packageName;
  }
}
