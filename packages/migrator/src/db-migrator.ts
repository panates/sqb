import type { ClientConfiguration } from '@sqb/connect';
import { AsyncEventEmitter } from 'strict-typed-events';
import { MariadbMigrationAdapter } from './adapters/mariadb-migration-adapter.js';
import { MssqlMigrationAdapter } from './adapters/mssql-migration-adapter.js';
import { MysqlMigrationAdapter } from './adapters/mysql-migration-adapter.js';
import { OracleMigrationAdapter } from './adapters/oracle-migration-adapter.js';
import { PgMigrationAdapter } from './adapters/pg-migration-adapter.js';
import { SqliteMigrationAdapter } from './adapters/sqlite-migration-adapter.js';
import { SqljsMigrationAdapter } from './adapters/sqljs-migration-adapter.js';
import { MigrationAdapter } from './migration-adapter.js';
import {
  isSqlScriptMigrationTask,
  type Migration,
  MigrationPackage,
  type MigrationPackageConfig,
  type MigrationTask,
} from './migration-package.js';
import { MigrationStatus } from './types.js';

/**
 * How {@link DbMigrator.execute} wraps a run in transactions - see
 * {@link DbMigratorOptions.transaction}.
 */
export type MigrationTransactionMode = 'run' | 'migration' | 'none';

/** Options for {@link DbMigrator.execute}. */
export interface DbMigratorOptions {
  /** Target database connection, including `dialect` (required, used to select a {@link MigrationAdapter}) and `driver` (needed only to disambiguate SQLite's `sqlite` vs `sqljs` drivers, which share the same dialect). */
  connection: ClientConfiguration;
  /** The migrations to apply - either an already-loaded {@link MigrationPackage} or a raw {@link MigrationPackageConfig} (loaded internally via `MigrationPackage.load`). */
  migrationPackage: MigrationPackage | MigrationPackageConfig;
  /** Schema (or, for dialects with no true schema concept, a table-name prefix) the adapter's bookkeeping tables live under. Defaults to `'__migration'`. */
  infoSchema?: string;
  /** Additional `$(name)` variables available for substitution in SQL-script tasks, beyond the adapter's own dialect-specific defaults (`$(schema)`, `$(tablespace)`, `$(owner)`). */
  scriptVariables?: Record<string, string>;
  /** Highest migration version to apply. Migrations above it are skipped; defaults to the package's highest version (apply everything). */
  targetVersion?: number;
  /**
   * Wraps the run in transactions, so a failure leaves the database as it
   * was: `'run'` - one transaction for the whole run (every pending
   * migration, its tasks and the version/event bookkeeping), committed at
   * the end and rolled back on any error; `'migration'` - one transaction
   * per migration, so an earlier migration that succeeded stays applied
   * when a later one fails; `'none'` (the default) - no transaction, each
   * task is applied as it runs. Needs an adapter whose dialect runs DDL
   * inside transactions (PostgreSQL, SQLite); MySQL, MariaDB and Oracle
   * commit implicitly on DDL, so their adapters refuse `'run'` and
   * `'migration'`. In a transactional run, a script with a statement the
   * dialect cannot run inside a transaction block (PostgreSQL: `CREATE
   * INDEX CONCURRENTLY`, `VACUUM`, `CREATE DATABASE`, ...) fails the run
   * before anything is applied.
   */
  transaction?: MigrationTransactionMode;
  /**
   * Runs every pending migration inside one transaction, emitting the same
   * events as a real run, then rolls back instead of committing - to try a
   * migration package against a database (say, a restore of production)
   * without changing it. Resolves like a real run, rejects with the error
   * a real run would have failed with. Implies `transaction: 'run'`; any
   * other `transaction` mode is refused.
   */
  dryRun?: boolean;
}

/**
 * Applies a {@link MigrationPackage} to a target database, dispatching to
 * the {@link MigrationAdapter} implementation matching the connection's
 * dialect. Emits `start`, `backup` (only if some migration in the run is
 * flagged `backup: true`), `migration-start`/`migration-finish` per
 * migration, `task-start`/`task-finish` per task, `commit`/`rollback` when
 * a transaction of a transactional run ends (a dry run always ends in
 * `rollback`), `restore` (only if a task fails and a backup had been
 * taken), and `finish` - see `AsyncEventEmitter` from `strict-typed-events`
 * for how to listen.
 */
export class DbMigrator extends AsyncEventEmitter {
  declare protected adapter: MigrationAdapter;

  /**
   * Loads the migration package (if not already loaded), validates
   * `options.targetVersion` against the package's version range, then
   * acquires the dialect adapter's schema lock and applies every
   * migration from the adapter's currently tracked version up to the
   * target version, in order - each task within a migration runs in
   * sequence, with a `writeEvent` bookkeeping entry logged before and
   * after (or instead of, on failure). The tracked version is only
   * advanced after all of a migration's tasks succeed, so a later run
   * resumes from the last fully-applied migration rather than a partially
   * applied one. With `options.transaction` set, the run (or each
   * migration) is wrapped in a transaction and rolled back on failure - the
   * failure is then recorded in the event log after the rollback, so it
   * does not vanish with it; with `options.dryRun`, the run's transaction
   * is rolled back on success too. If any task throws and the run included
   * a migration flagged `backup: true`, the adapter's `restoreDatabase()`
   * is invoked before the error propagates. The schema lock and connection
   * are always released, whether the run succeeds or fails.
   *
   * @throws {TypeError} if `options.connection.dialect` is missing, or is a dialect with no registered adapter; if `options.transaction` is a mode the adapter does not support, or `options.dryRun` is combined with a `transaction` mode other than `'run'`
   * @throws {Error} if `options.targetVersion` is lower than the package's minimum migration version, or if the adapter's currently tracked version is more than one below that minimum (meaning some earlier migration was never applied); in a transactional run, if a pending script has a statement that cannot run inside a transaction block
   * @returns `true` once every applicable migration has been applied (or, in a dry run, rolled back)
   */
  async execute(options: DbMigratorOptions): Promise<boolean> {
    if (!options.connection.dialect)
      throw new TypeError(`You must provide connection.dialect`);

    const migrationPackage = await MigrationPackage.load(
      options.migrationPackage,
    );

    let minVersion = migrationPackage.migrations.reduce(
      (a, m) => Math.min(a, m.version),
      Number.MAX_SAFE_INTEGER,
    );
    if (minVersion === Number.MAX_SAFE_INTEGER) minVersion = 0;
    const maxVersion = migrationPackage.migrations.reduce(
      (a, m) => Math.max(a, m.version),
      0,
    );

    const targetVersion: number = Math.min(
      options?.targetVersion ?? Number.MAX_SAFE_INTEGER,
      maxVersion,
    );

    if (targetVersion && targetVersion < minVersion) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        `Version mismatch. Target schema version (${targetVersion}) is lower than ` +
          `migration package min version (${minVersion})`,
      );
    }

    let migrationAdapter: MigrationAdapter;
    switch (options.connection.dialect) {
      case 'postgres': {
        migrationAdapter = await PgMigrationAdapter.create({
          ...options,
          migrationPackage,
        });
        break;
      }
      case 'oracle': {
        migrationAdapter = await OracleMigrationAdapter.create({
          ...options,
          migrationPackage,
        });
        break;
      }
      case 'mysql': {
        migrationAdapter = await MysqlMigrationAdapter.create({
          ...options,
          migrationPackage,
        });
        break;
      }
      case 'mariadb': {
        migrationAdapter = await MariadbMigrationAdapter.create({
          ...options,
          migrationPackage,
        });
        break;
      }
      case 'mssql': {
        migrationAdapter = await MssqlMigrationAdapter.create({
          ...options,
          migrationPackage,
        });
        break;
      }
      case 'sqlite': {
        // @sqb/sqlite and @sqb/sqljs both register the "sqlite" dialect
        // (they only differ in driver), so the driver name is what tells
        // them apart here.
        migrationAdapter =
          options.connection.driver === 'sqljs'
            ? await SqljsMigrationAdapter.create({
                ...options,
                migrationPackage,
              })
            : await SqliteMigrationAdapter.create({
                ...options,
                migrationPackage,
              });
        break;
      }
      default:
        throw new TypeError(
          `Migration adapter for "${options.connection.dialect}" dialect is not implemented yet`,
        );
    }
    const dryRun = !!options.dryRun;
    const transactionMode: MigrationTransactionMode =
      options.transaction ?? (dryRun ? 'run' : 'none');
    /** Whether `backupDatabase()` succeeded, so that there is a backup to restore. */
    let backupTaken = false;
    /** Whether a transaction this run began is open. */
    let inTransaction = false;
    const rollback = async () => {
      inTransaction = false;
      await migrationAdapter.rollback();
      // The adapter's own view of status/version went with the rollback.
      await migrationAdapter.refresh();
      await this.emitAsync('rollback');
    };
    const commit = async () => {
      inTransaction = false;
      await migrationAdapter.commit();
      await this.emitAsync('commit');
    };
    try {
      if (dryRun && transactionMode !== 'run') {
        // noinspection ExceptionCaughtLocallyJS
        throw new TypeError(
          `A dry run needs transaction: 'run', not '${transactionMode}'`,
        );
      }
      if (
        transactionMode !== 'none' &&
        !migrationAdapter.supportsTransactions
      ) {
        // noinspection ExceptionCaughtLocallyJS
        throw new TypeError(
          `Transactional migration runs are not supported by the ` +
            `"${options.connection.dialect}" migration adapter`,
        );
      }
      if (
        migrationAdapter.version &&
        migrationAdapter.version < minVersion - 1
      ) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(
          `This package can migrate starting from ${minVersion - 1} but current version is ${migrationAdapter.version}`,
        );
      }

      const { migrations } = migrationPackage;
      // calculate total scripts;
      const total = migrations.reduce((i, x) => i + x.tasks.length, 0);
      const needBackup = !!migrations.find(x => !!x.backup);

      await this.emitAsync('start');
      let task: MigrationTask;

      await migrationAdapter.lockSchema();
      if (needBackup) {
        await this.emitAsync('backup');
        await migrationAdapter.backupDatabase();
        backupTaken = true;
      }

      const isPending = (migration: Migration) =>
        migration.version <= targetVersion &&
        migrationAdapter.version < migration.version;

      if (transactionMode !== 'none') {
        // Fail before anything runs, rather than partway through, on a
        // statement the dialect cannot run inside a transaction block. A
        // script produced by a function is checked by the adapter when it
        // runs, since calling the function here might not be free of side
        // effects.
        for (const migration of migrations.filter(isPending)) {
          for (task of migration.tasks) {
            if (
              isSqlScriptMigrationTask(task) &&
              typeof task.script === 'string'
            )
              migrationAdapter.assertTransactionalScript(
                task.script,
                task,
                migrationPackage,
              );
          }
        }
        if (transactionMode === 'run') {
          await migrationAdapter.startTransaction();
          inTransaction = true;
        }
      }

      // Execute migration tasks
      let migrationIndex = -1;
      for (const migration of migrations) {
        migrationIndex++;
        if (!isPending(migration)) continue;
        if (transactionMode === 'migration') {
          await migrationAdapter.startTransaction();
          inTransaction = true;
        }
        await this.emitAsync('migration-start', {
          migration,
          total: migrations.length,
          index: migrationIndex,
        });
        for (let index = 0; index < migration.tasks.length; index++) {
          task = migration.tasks[index];
          await this.emitAsync('task-start', { migration, task, total, index });
          await migrationAdapter.update({ status: MigrationStatus.busy });
          await migrationAdapter.writeEvent({
            event: MigrationAdapter.EventKind.started,
            version: migration.version,
            title: task.title,
            filename: task.filename,
            message: `Task "${task.title}" started`,
          });
          try {
            await migrationAdapter.executeTask(
              migrationPackage,
              migration,
              task,
              {
                ...(options.connection.schema
                  ? { schema: options.connection.schema }
                  : {}),
                ...options.scriptVariables,
              },
            );
            await migrationAdapter.writeEvent({
              event: MigrationAdapter.EventKind.success,
              version: migration.version,
              title: task.title,
              filename: task.filename,
              message: `Task "${task.title}" completed`,
            });
          } catch (e: any) {
            const errorEvent: MigrationAdapter.Event = {
              event: MigrationAdapter.EventKind.error,
              version: migration.version,
              title: task.title,
              filename: task.filename,
              message: String(e),
              details:
                e.message +
                '\n\n' +
                Object.keys(e)
                  .filter(k => e[k] != null)
                  .map(k => k + ': ' + e[k])
                  .join('\n'),
            };
            if (inTransaction) {
              // Written after the rollback, or it would vanish with it. Not
              // in a dry run, which must leave the database as it was.
              await rollback();
              if (!dryRun) await migrationAdapter.writeEvent(errorEvent);
            } else await migrationAdapter.writeEvent(errorEvent);
            // noinspection ExceptionCaughtLocallyJS
            throw e;
          }
          await this.emitAsync('task-finish', {
            migration,
            task,
            total,
            index,
          });
        }
        await migrationAdapter.update({
          version: migration.version,
          status: MigrationStatus.idle,
        });
        await this.emitAsync('migration-finish', {
          migration,
          total: migrations.length,
          index: migrationIndex,
        });
        if (transactionMode === 'migration') await commit();
      }
      if (transactionMode === 'run') {
        if (dryRun) await rollback();
        else await commit();
      }
    } catch (e) {
      if (inTransaction) {
        try {
          await rollback();
        } catch {
          // The original error is the one to report.
        }
      }
      if (backupTaken) {
        await this.emitAsync('restore');
        await migrationAdapter.restoreDatabase();
      }
      throw e;
    } finally {
      try {
        await migrationAdapter.unlockSchema();
      } finally {
        await migrationAdapter.close();
      }
    }
    await this.emitAsync('finish');
    return true;
  }
}
