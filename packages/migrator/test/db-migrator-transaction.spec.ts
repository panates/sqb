import type { ClientConfiguration } from '@sqb/connect';
import assert from 'assert';
import { getDirname } from 'cross-dirname';
import { Connection } from 'postgrejs';
import {
  DbMigrator,
  type DbMigratorOptions,
  type MigrationPackageConfig,
} from '../src/index.js';

describe('migrator:DbMigrator (transactions, postgres)', () => {
  const schema = 'migrator_tx_test';
  const infoSchema = '__migration_tx';
  const connectionConfig: ClientConfiguration = {
    dialect: 'postgres',
    database: 'sqb_test',
    schema,
  };
  const defaultOptions: Omit<DbMigratorOptions, 'migrationPackage'> = {
    connection: connectionConfig,
    infoSchema,
  };
  let connection: Connection;

  const createTable = (name: string) =>
    `CREATE SCHEMA IF NOT EXISTS $(schema);\n` +
    `CREATE TABLE $(schema).${name} (id integer NOT NULL PRIMARY KEY);`;

  const pkg = (
    name: string,
    migrations: MigrationPackageConfig['migrations'],
  ): MigrationPackageConfig => ({ name, baseDir: getDirname(), migrations });

  /** v1 creates t1; v2 creates t2, then fails. */
  const failingPackage = (name: string) =>
    pkg(name, [
      {
        version: 1,
        tasks: [{ title: 'create t1', script: createTable('t1') }],
      },
      {
        version: 2,
        tasks: [
          { title: 'create t2', script: createTable('t2') },
          { title: 'fail', script: 'SELECT * FROM $(schema).no_such_table;' },
        ],
      },
    ]);

  const okPackage = (name: string) =>
    pkg(name, [
      {
        version: 1,
        tasks: [{ title: 'create t1', script: createTable('t1') }],
      },
      {
        version: 2,
        tasks: [{ title: 'create t2', script: createTable('t2') }],
      },
    ]);

  before(async () => {
    connection = new Connection({ database: 'postgres' });
    await connection.connect();
    const r = await connection.query(
      'SELECT oid FROM pg_database WHERE datname = $1',
      { params: [connectionConfig.database] },
    );
    if (!(r.rows && r.rows.length)) {
      await connection.execute('CREATE DATABASE ' + connectionConfig.database, {
        autoCommit: true,
      });
    }
    await connection.close(0);
    connection = new Connection({ database: connectionConfig.database });
    await connection.connect();
  });

  beforeEach(async () => {
    await connection.execute(`drop schema if exists ${infoSchema} cascade;`);
    await connection.execute(`drop schema if exists ${schema} cascade;`);
  });

  after(async () => {
    await connection.execute(`drop schema if exists ${infoSchema} cascade;`);
    await connection.execute(`drop schema if exists ${schema} cascade;`);
    await connection.close(0);
  });

  async function tableExists(name: string): Promise<boolean> {
    const r = await connection.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      { params: [schema, name] },
    );
    return !!r.rows?.length;
  }

  async function trackedVersion(packageName: string): Promise<number> {
    const r = await connection.query(
      `SELECT current_version, status FROM ${infoSchema}.migration_summary WHERE package_name = $1`,
      { params: [packageName], objectRows: true },
    );
    assert.strictEqual(r.rows?.[0]?.status, 'idle');
    return r.rows![0].current_version;
  }

  async function events(packageName: string): Promise<string[]> {
    const r = await connection.query(
      `SELECT event FROM ${infoSchema}.migration_events WHERE package_name = $1 ORDER BY id`,
      { params: [packageName], objectRows: true },
    );
    return (r.rows || []).map(row => row.event);
  }

  it("should leave no trace when a run fails with transaction: 'run'", async () => {
    const migrator = new DbMigrator();
    const emitted: string[] = [];
    for (const ev of ['task-finish', 'commit', 'rollback', 'finish'])
      migrator.on(ev, () => emitted.push(ev));
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: failingPackage('TxRun'),
          transaction: 'run',
        }),
      /no_such_table/,
    );
    assert.strictEqual(await tableExists('t1'), false);
    assert.strictEqual(await tableExists('t2'), false);
    assert.strictEqual(await trackedVersion('TxRun'), 0);
    // The failure is recorded after the rollback, the rest went with it.
    assert.deepStrictEqual(await events('TxRun'), ['error']);
    assert.deepStrictEqual(emitted, ['task-finish', 'task-finish', 'rollback']);
  });

  it("should keep the migrations that succeeded with transaction: 'migration'", async () => {
    const migrator = new DbMigrator();
    const emitted: string[] = [];
    for (const ev of ['commit', 'rollback', 'finish'])
      migrator.on(ev, () => emitted.push(ev));
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: failingPackage('TxMigration'),
          transaction: 'migration',
        }),
      /no_such_table/,
    );
    assert.strictEqual(await tableExists('t1'), true);
    assert.strictEqual(await tableExists('t2'), false);
    assert.strictEqual(await trackedVersion('TxMigration'), 1);
    assert.deepStrictEqual(await events('TxMigration'), [
      'started',
      'success',
      'error',
    ]);
    assert.deepStrictEqual(emitted, ['commit', 'rollback']);
  });

  it("should commit a successful run with transaction: 'run'", async () => {
    const migrator = new DbMigrator();
    const emitted: string[] = [];
    for (const ev of ['commit', 'rollback', 'finish'])
      migrator.on(ev, () => emitted.push(ev));
    assert.strictEqual(
      await migrator.execute({
        ...defaultOptions,
        migrationPackage: okPackage('TxOk'),
        transaction: 'run',
      }),
      true,
    );
    assert.strictEqual(await tableExists('t1'), true);
    assert.strictEqual(await tableExists('t2'), true);
    assert.strictEqual(await trackedVersion('TxOk'), 2);
    assert.deepStrictEqual(emitted, ['commit', 'finish']);
  });

  it('should run everything and change nothing in a dry run', async () => {
    const migrator = new DbMigrator();
    const emitted: string[] = [];
    for (const ev of [
      'migration-start',
      'task-finish',
      'migration-finish',
      'commit',
      'rollback',
      'finish',
    ])
      migrator.on(ev, () => emitted.push(ev));
    assert.strictEqual(
      await migrator.execute({
        ...defaultOptions,
        migrationPackage: okPackage('DryRun'),
        dryRun: true,
      }),
      true,
    );
    assert.strictEqual(await tableExists('t1'), false);
    assert.strictEqual(await tableExists('t2'), false);
    assert.strictEqual(await trackedVersion('DryRun'), 0);
    assert.deepStrictEqual(await events('DryRun'), []);
    assert.deepStrictEqual(emitted, [
      'migration-start',
      'task-finish',
      'migration-finish',
      'migration-start',
      'task-finish',
      'migration-finish',
      'rollback',
      'finish',
    ]);
  });

  it('should report a failure in a dry run, without recording it', async () => {
    const migrator = new DbMigrator();
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: failingPackage('DryFail'),
          dryRun: true,
        }),
      /no_such_table/,
    );
    assert.strictEqual(await tableExists('t1'), false);
    assert.strictEqual(await trackedVersion('DryFail'), 0);
    assert.deepStrictEqual(await events('DryFail'), []);
  });

  it('should refuse a dry run with another transaction mode', async () => {
    const migrator = new DbMigrator();
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: okPackage('DryNone'),
          dryRun: true,
          transaction: 'none',
        }),
      /dry run needs transaction: 'run'/,
    );
  });

  it('should fail before running anything on a statement that cannot run in a transaction', async () => {
    const migrator = new DbMigrator();
    const started: string[] = [];
    migrator.on('task-start', ({ task }) => started.push(task.title));
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: pkg('TxConc', [
            {
              version: 1,
              tasks: [{ title: 'create t1', script: createTable('t1') }],
            },
            {
              version: 2,
              tasks: [
                {
                  title: 'index',
                  script:
                    '-- create index concurrently in a comment is fine\n' +
                    "SELECT 'create index concurrently in a literal is fine';\n" +
                    'CREATE INDEX CONCURRENTLY ix_t1 ON $(schema).t1 (id);',
                },
              ],
            },
          ]),
          transaction: 'run',
        }),
      /Task "index" has a statement that cannot run inside a transaction block: "CREATE INDEX CONCURRENTLY ix_t1 ON \$\(schema\)\.t1 \(id\)"/,
    );
    assert.deepStrictEqual(started, []);
    assert.strictEqual(await tableExists('t1'), false);
  });

  it('should not flag what only looks like a non-transactional statement', async () => {
    const migrator = new DbMigrator();
    await migrator.execute({
      ...defaultOptions,
      migrationPackage: pkg('TxLookalike', [
        {
          version: 1,
          tasks: [
            {
              title: 'lookalikes',
              script:
                createTable('t1') +
                '\nALTER TABLE $(schema).t1 ADD COLUMN vacuum integer;' +
                '\nCREATE FUNCTION $(schema).f() RETURNS void LANGUAGE plpgsql AS $$' +
                '\nBEGIN PERFORM 1; COMMIT; END $$;',
            },
          ],
        },
      ]),
      transaction: 'run',
    });
    assert.strictEqual(await tableExists('t1'), true);
  });

  it('should check a script produced by a function when it runs', async () => {
    const migrator = new DbMigrator();
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: pkg('TxFn', [
            {
              version: 1,
              tasks: [{ title: 'create t1', script: createTable('t1') }],
            },
            {
              version: 2,
              tasks: [
                { title: 'vacuum', script: () => 'VACUUM $(schema).t1;' },
              ],
            },
          ]),
          transaction: 'run',
        }),
      /Task "vacuum" has a statement that cannot run inside a transaction block: "VACUUM migrator_tx_test\.t1"/,
    );
    assert.strictEqual(await tableExists('t1'), false);
    assert.strictEqual(await trackedVersion('TxFn'), 0);
  });

  it('should refuse a migration flagged backup, rather than pretend to back up', async () => {
    const migrator = new DbMigrator();
    await assert.rejects(
      () =>
        migrator.execute({
          ...defaultOptions,
          migrationPackage: pkg('Backup', [
            {
              version: 1,
              backup: true,
              tasks: [{ title: 'create t1', script: createTable('t1') }],
            },
          ]),
        }),
      /Database backup is not supported by PgMigrationAdapter/,
    );
    assert.strictEqual(await tableExists('t1'), false);
  });
});
