import type { ClientConfiguration } from '@sqb/connect';
import assert from 'assert';
import oracledb from 'oracledb';
import { DbMigrator, type DbMigratorOptions } from '../src/index.js';
import { Test1OracleMigrationPackage } from './_support/test1-migrations.oracle.js';
import { Test2OracleMigrationPackage } from './_support/test2-migrations.oracle.js';

describe('migrator:DbMigrator (oracle)', () => {
  const schema = 'MIGRATOR_TEST';
  const schemaPassword = 'Migrator_Test_2024!';
  const connectString = `${process.env.ORAHOST || 'localhost'}:${
    process.env.ORAPORT || 1521
  }/${process.env.ORADATABASE || 'FREEPDB1'}`;
  const connectionConfig: ClientConfiguration = {
    dialect: 'oracle',
    host: process.env.ORAHOST || 'localhost',
    port: process.env.ORAPORT ? parseInt(process.env.ORAPORT, 10) : 1521,
    database: process.env.ORADATABASE || 'FREEPDB1',
    user: schema,
    password: schemaPassword,
  };
  const defaultOptions: Omit<DbMigratorOptions, 'migrationPackage'> = {
    connection: connectionConfig,
  };
  let adminConn: oracledb.Connection;
  let userConn: oracledb.Connection;

  before(async function () {
    this.timeout(30000);
    adminConn = await oracledb.getConnection({
      connectString,
      user: process.env.ORAUSER || 'system',
      password: process.env.ORAPASSWORD || 'Sqb_Test_2024!',
    });
    // Fresh, dedicated schema/user for this test run - a real Oracle
    // "schema" is a user, so this doubles as provisioning the target
    // schema the migrator's adapter deliberately never creates itself.
    await adminConn.execute(
      `BEGIN
         EXECUTE IMMEDIATE 'DROP USER ${schema} CASCADE';
       EXCEPTION
         WHEN OTHERS THEN IF SQLCODE != -1918 THEN RAISE; END IF;
       END;`,
    );
    await adminConn.execute(
      `CREATE USER ${schema} IDENTIFIED BY "${schemaPassword}"`,
    );
    await adminConn.execute(
      `GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE TRIGGER, UNLIMITED TABLESPACE TO ${schema}`,
    );
    // @sqb/oracle's own adapter queries v$mystat (via SELECT_CATALOG_ROLE)
    // to read back the session id on connect.
    await adminConn.execute(`GRANT SELECT_CATALOG_ROLE TO ${schema}`);
    await adminConn.commit();

    userConn = await oracledb.getConnection({
      connectString,
      user: schema,
      password: schemaPassword,
    });
  });

  after(async () => {
    await userConn?.close();
    await adminConn?.close();
  });

  async function tableExists(name: string): Promise<boolean> {
    const r = await userConn.execute<any>(
      'SELECT table_name FROM user_tables WHERE table_name = :1',
      [name.toUpperCase()],
    );
    return !!r.rows?.length;
  }

  it('should apply migrations', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1OracleMigrationPackage,
      targetVersion: 10,
    });

    assert.strictEqual(await tableExists('table1'), true);
    assert.strictEqual(await tableExists('table2'), false);
  });

  it('should migrate to next version', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1OracleMigrationPackage,
      targetVersion: 11,
    });

    assert.strictEqual(await tableExists('table1'), true);
    assert.strictEqual(await tableExists('table2'), true);
  });

  it('should insert data', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1OracleMigrationPackage,
      targetVersion: 12,
    });

    const r = await userConn.execute<any>(
      'SELECT id, name FROM table1 ORDER BY id',
    );
    assert.ok(r.rows);
    assert.strictEqual(r.rows?.length, 2);
    assert.strictEqual(r.rows[0][0], 1);
    assert.strictEqual(r.rows[0][1], 'name1');
  });

  it('should apply migrations (migration file search, "/"-terminated PL/SQL block)', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test2OracleMigrationPackage,
    });

    assert.strictEqual(await tableExists('table3'), true);
    assert.strictEqual(await tableExists('table4'), true);

    const r = await userConn.execute<any>(
      'SELECT id, name FROM table3 ORDER BY id',
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
          migrationPackage: Test1OracleMigrationPackage,
          targetVersion: 1,
        }),
      /Version mismatch/,
    );
  });
});
