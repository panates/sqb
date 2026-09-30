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
  MigrationPackage,
  type MigrationPackageConfig,
  type MigrationTask,
} from './migration-package.js';
import { MigrationStatus } from './types.js';

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
}

/**
 * Applies a {@link MigrationPackage} to a target database, dispatching to
 * the {@link MigrationAdapter} implementation matching the connection's
 * dialect. Emits `start`, `backup` (only if some migration in the run is
 * flagged `backup: true`), `migration-start`/`migration-finish` per
 * migration, `task-start`/`task-finish` per task, `restore` (only if a
 * task fails and a backup had been taken), and `finish` - see
 * `AsyncEventEmitter` from `strict-typed-events` for how to listen.
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
   * applied one. If any task throws and the run included a migration
   * flagged `backup: true`, the adapter's `restoreDatabase()` is invoked
   * before the error propagates. The schema lock and connection are always
   * released, whether the run succeeds or fails.
   *
   * @throws {TypeError} if `options.connection.dialect` is missing, or is a dialect with no registered adapter
   * @throws {Error} if `options.targetVersion` is lower than the package's minimum migration version, or if the adapter's currently tracked version is more than one below that minimum (meaning some earlier migration was never applied)
   * @returns `true` once every applicable migration has been applied
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
    let needBackup = false;
    try {
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
      needBackup = !!migrations.find(x => !!x.backup);

      await this.emitAsync('start');
      let task: MigrationTask;

      await migrationAdapter.lockSchema();
      if (needBackup) {
        await this.emitAsync('backup');
        await migrationAdapter.backupDatabase();
      }

      // Execute migration tasks
      let migrationIndex = -1;
      for (const migration of migrations) {
        migrationIndex++;
        if (
          migration.version > targetVersion ||
          migrationAdapter.version >= migration.version
        )
          continue;
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
            await migrationAdapter.writeEvent({
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
            });
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
      }
    } catch (e) {
      if (needBackup) {
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
