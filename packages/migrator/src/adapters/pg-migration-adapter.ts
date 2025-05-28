import { PgAdapter } from '@sqb/postgres';
import path from 'path';
import { Connection, stringifyValueForSQL } from 'postgrejs';
import { StrictOmit } from 'ts-gems';
import type { DbMigratorOptions } from '../db-migrator.js';
import { MigrationAdapter } from '../migration-adapter.js';
import {
  isCustomMigrationTask,
  isInsertDataMigrationTask,
  isSqlScriptMigrationTask,
  Migration,
  MigrationPackage,
  MigrationTask,
} from '../migration-package.js';
import { MigrationStatus } from '../types.js';

const pgAdapter = new PgAdapter();

export class PgMigrationAdapter extends MigrationAdapter {
  declare protected _connection: Connection;
  protected _infoSchema = 'public';
  declare protected _migrationPackage: MigrationPackage;
  protected _version = 0;
  protected _status: MigrationStatus = MigrationStatus.idle;
  protected defaultVariables = {
    tablespace: 'pg_default',
    schema: 'public',
    owner: 'postgres',
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
    return this.infoSchema + '.' + this.summaryTable;
  }

  get eventTableFull(): string {
    return this.infoSchema + '.' + this.eventTable;
  }

  static async create(
    options: StrictOmit<DbMigratorOptions, 'migrationPackage'> & {
      migrationPackage: MigrationPackage;
    },
  ): Promise<PgMigrationAdapter> {
    // Create connection
    const connection = ((await pgAdapter.connect(options.connection)) as any)
      .intlcon as Connection;
    try {
      const adapter = new PgMigrationAdapter();
      adapter._connection = connection;
      adapter._migrationPackage = options.migrationPackage;
      adapter._infoSchema = options.infoSchema || '__migration';
      adapter.defaultVariables.schema = options.connection.schema || '';
      if (!adapter.defaultVariables.schema) {
        const r = await connection.query('SELECT CURRENT_SCHEMA ', {
          objectRows: true,
        });
        adapter.defaultVariables.schema =
          r.rows?.[0]?.current_schema || 'public';
      }

      // Check if migration schema
      await connection.query(
        `CREATE SCHEMA IF NOT EXISTS ${adapter.infoSchema} AUTHORIZATION postgres;`,
      );
      // Create summary table if not exists
      await connection.execute(`
CREATE TABLE IF NOT EXISTS ${adapter.summaryTableFull}
(
    package_name varchar not null,
    status varchar(16) not null,
    current_version integer not null default 0,
    created_at timestamp without time zone not null default current_timestamp,
    updated_at timestamp without time zone,
    CONSTRAINT pk_${adapter.summaryTable} PRIMARY KEY (package_name)
)`);

      // Create events table if not exists
      await connection.execute(`
CREATE TABLE IF NOT EXISTS ${adapter.eventTableFull}
(
    id serial not null,
    package_name varchar not null,           
    version integer not null default 0,
    event varchar(16) not null,
    event_time timestamp without time zone not null,
    title text,
    message text not null,          
    filename text,
    details text,
    CONSTRAINT pk_${adapter.eventTable} PRIMARY KEY (id)
)`);

      // Insert summary record if not exists
      const r = await connection.query(
        `SELECT status FROM ${adapter.summaryTableFull} WHERE package_name = $1`,
        {
          params: [adapter.packageName],
          objectRows: true,
        },
      );
      if (!(r && r.rows?.length)) {
        await connection.query(
          `insert into ${adapter.summaryTableFull} (package_name, status) values ($1, $2)`,
          {
            params: [adapter.packageName, MigrationStatus.idle],
          },
        );
      }

      await adapter.refresh();
      return adapter;
    } catch (e) {
      await connection.close(0);
      throw e;
    }
  }

  async close(): Promise<void> {
    await this._connection.close();
  }

  async refresh(): Promise<void> {
    const r = await this._connection.query(
      `SELECT * FROM ${this.summaryTableFull} WHERE package_name = $1`,
      {
        params: [this.packageName],
        objectRows: true,
      },
    );
    const row = r.rows && r.rows[0];
    if (!row) throw new Error('Summary record did not created');
    this._version = row.current_version;
    this._status = row.status;
  }

  async update(info: {
    status?: MigrationStatus;
    version?: number;
  }): Promise<void> {
    let sql = '';
    const params: any[] = [];
    if (info.status && info.status !== this.status) {
      params.push(info.status);
      sql += ',\n  status = $' + params.length;
    }
    if (info.version && info.version !== this.version) {
      params.push(info.version);
      sql += ',\n  current_version = $' + params.length;
    }
    if (sql) {
      params.push(this.packageName);
      sql =
        `update ${this.summaryTableFull} set updated_at = current_timestamp` +
        sql +
        `\n where package_name =$` +
        params.length;
      await this._connection.query(sql, { params });
      if (info.status) this._status = info.status;
      if (info.version) this._version = info.version;
    }
  }

  async writeEvent(event: MigrationAdapter.Event): Promise<void> {
    const sql =
      `insert into ${this.eventTableFull} ` +
      '(package_name, version, event, event_time, title, message, filename, details) ' +
      'values ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)';
    await this._connection.query(sql, {
      params: [
        this.packageName,
        event.version,
        event.event,
        event.title,
        event.message,
        event.filename,
        event.details,
      ],
    });
  }

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
        await this._connection.execute(script);
      } catch (e: any) {
        let msg = `Error in task "${task.title}"`;
        if (task.filename)
          msg +=
            '\n at ' + path.relative(migrationPackage.baseDir, task.filename);
        if (e.lineNr) {
          if (!task.filename) e.message += '\n at';
          msg += ` (${e.lineNr},${e.colNr}):\n` + e.line;
          if (e.colNr) msg += '\n' + ' '.repeat(e.colNr - 1) + '^';
        }
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
      const script = task.rows
        .map(row => this.rowToSql(tableName, row))
        .join('\n');
      await this._connection.execute(script);
    }
  }

  backupDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  lockSchema(): Promise<void> {
    return Promise.resolve(undefined);
  }

  restoreDatabase(): Promise<void> {
    return Promise.resolve(undefined);
  }

  unlockSchema(): Promise<void> {
    return Promise.resolve(undefined);
  }

  protected rowToSql(tableName: string, row: Object): string {
    let sql = '';
    const keys = Object.keys(row);
    sql += `insert into ${tableName} (${keys}) values (`;
    for (let i = 0; i < keys.length; i++) {
      sql += (i ? ', ' : '') + stringifyValueForSQL(row[keys[i]]);
    }
    sql += ');\n';
    return sql;
  }
}
