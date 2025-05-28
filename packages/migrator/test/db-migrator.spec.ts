import { ClientConfiguration } from '@sqb/connect';
import assert from 'assert';
import { Connection } from 'postgrejs';
import { DbMigrator, DbMigratorOptions } from '../src/index.js';
import { Test1MigrationPackage } from './_support/test1-migrations.js';
import { Test2MigrationPackage } from './_support/test2-migrations.js';

describe('DbMigrator', () => {
  const connectionConfig: ClientConfiguration = {
    dialect: 'postgres',
    database: 'sqb_test',
    schema: 'migrator_test',
  };
  const defaultOptions: Omit<DbMigratorOptions, 'migrationPackage'> = {
    connection: connectionConfig,
  };
  let connection: Connection;

  beforeAll(async () => {
    connection = new Connection({ database: 'postgres' });
    await connection.connect();
    const r = await connection.query(
      'SELECT oid FROM pg_database WHERE datname = $1',
      {
        params: [connectionConfig.database],
      },
    );
    if (!(r.rows && r.rows.length)) {
      await connection.execute('CREATE DATABASE ' + connectionConfig.database, {
        autoCommit: true,
      });
    }
    await connection.close(0);
    connection = new Connection({ database: connectionConfig.database });
    await connection.connect();
    await connection.execute(`drop schema if exists __migration cascade;`);
    await connection.execute(
      `drop schema if exists ${connectionConfig.schema} cascade;`,
    );
  });

  afterAll(async () => {
    await connection.close(0);
  });

  it('should apply migrations', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1MigrationPackage,
      targetVersion: 10,
    });

    let r = await connection.query(
      'SELECT oid FROM pg_database WHERE datname = $1',
      {
        params: [connectionConfig.database],
      },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);

    r = await connection.query(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
      {
        params: [connectionConfig.schema],
      },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], connectionConfig.schema);

    r = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      { params: [connectionConfig.schema, 'table1'] },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], 'table1');

    r = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      { params: [connectionConfig.schema, 'table2'] },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 0);
  });

  it('should migrate to next version', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1MigrationPackage,
      targetVersion: 11,
    });

    let r = await connection.query(
      'SELECT oid FROM pg_database WHERE datname = $1',
      {
        params: [connectionConfig.database],
      },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);

    r = await connection.query(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
      {
        params: [connectionConfig.schema],
      },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], connectionConfig.schema);

    r = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE  table_schema = $1 AND table_name = $2',
      { params: [connectionConfig.schema, 'table1'] },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], 'table1');

    r = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE  table_schema = $1 AND table_name = $2',
      { params: [connectionConfig.schema, 'table2'] },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], 'table2');
  });

  it('should insert data', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1MigrationPackage,
      targetVersion: 12,
    });

    const r = await connection.query(
      `SELECT id, name FROM ${connectionConfig.schema}.table1`,
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 2);
    assert.strictEqual(r.rows[0][0], 1);
    assert.strictEqual(r.rows[0][1], 'name1');
  });

  it('should apply migrations (migration file search)', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test2MigrationPackage,
    });

    let r = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE  table_schema = $1 AND table_name = $2',
      { params: [connectionConfig.schema, 'table3'] },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], 'table3');

    r = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE  table_schema = $1 AND table_name = $2',
      { params: [connectionConfig.schema, 'table4'] },
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 1);
    // @ts-ignore
    assert.strictEqual(r.rows[0][0], 'table4');

    r = await connection.query(
      `SELECT id, name FROM ${connectionConfig.schema}.table3`,
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows.length, 4);
  });

  it('should check target version is not lower than package min version', async () => {
    const migrator = new DbMigrator();
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: Test1MigrationPackage,
          targetVersion: 1,
        }),
      /Version mismatch/,
    );
  });
});
