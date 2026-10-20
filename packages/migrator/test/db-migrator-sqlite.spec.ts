import { DatabaseSync } from 'node:sqlite';
import type { ClientConfiguration } from '@sqb/connect';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DbMigrator, type DbMigratorOptions } from '../src/index.js';
import { Test1SqliteMigrationPackage } from './_support/test1-migrations.sqlite.js';
import { Test2SqliteMigrationPackage } from './_support/test2-migrations.sqlite.js';

describe('migrator:DbMigrator (sqlite)', () => {
  const infoSchema = '__migration_test';
  const dbFile = path.join(os.tmpdir(), 'sqb-migrator-test.sqlite');
  const connectionConfig: ClientConfiguration = {
    dialect: 'sqlite',
    database: dbFile,
  };
  const defaultOptions: Omit<DbMigratorOptions, 'migrationPackage'> = {
    connection: connectionConfig,
    infoSchema,
  };
  let connection: DatabaseSync;

  before(() => {
    fs.rmSync(dbFile, { force: true });
    connection = new DatabaseSync(dbFile);
  });

  after(() => {
    connection.close();
    fs.rmSync(dbFile, { force: true });
  });

  function tableExists(name: string): boolean {
    const row = connection
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(name);
    return !!row;
  }

  it('should change nothing in a dry run', async () => {
    const migrator = new DbMigrator();
    const emitted: string[] = [];
    for (const ev of ['commit', 'rollback', 'finish'])
      migrator.on(ev, () => emitted.push(ev));
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1SqliteMigrationPackage,
      targetVersion: 10,
      dryRun: true,
    });
    assert.strictEqual(tableExists('table1'), false);
    assert.deepStrictEqual(emitted, ['rollback', 'finish']);
  });

  it('should apply migrations', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1SqliteMigrationPackage,
      targetVersion: 10,
    });

    assert.strictEqual(tableExists('table1'), true);
    assert.strictEqual(tableExists('table2'), false);
  });

  it('should migrate to next version', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1SqliteMigrationPackage,
      targetVersion: 11,
    });

    assert.strictEqual(tableExists('table1'), true);
    assert.strictEqual(tableExists('table2'), true);
  });

  it('should insert data', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test1SqliteMigrationPackage,
      targetVersion: 12,
    });

    const rows: any[] = connection
      .prepare(`SELECT id, name FROM table1 ORDER BY id`)
      .all();
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].id, 1);
    assert.strictEqual(rows[0].name, 'name1');
  });

  it('should apply migrations (migration file search, multi-statement script with a trigger)', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: Test2SqliteMigrationPackage,
    });

    assert.strictEqual(tableExists('table3'), true);
    assert.strictEqual(tableExists('table4'), true);

    const rows: any[] = connection
      .prepare(`SELECT id, name, active FROM table3 ORDER BY id`)
      .all();
    assert.strictEqual(rows.length, 4);
    // active isn't provided by the insert-data task - the trigger's
    // NULL-check sets it to 1 after insert.
    assert.strictEqual(rows[0].active, 1);
  });

  it('should check target version is not lower than package min version', async () => {
    const migrator = new DbMigrator();
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: Test1SqliteMigrationPackage,
          targetVersion: 1,
        }),
      /Version mismatch/,
    );
  });
});
