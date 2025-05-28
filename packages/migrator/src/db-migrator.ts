import { ClientConfiguration } from '@sqb/connect';
import { AsyncEventEmitter } from 'strict-typed-events';
import { PgMigrationAdapter } from './adapters/pg-migration-adapter.js';
import { MigrationAdapter } from './migration-adapter.js';
import {
  MigrationPackage,
  MigrationPackageConfig,
  MigrationTask,
} from './migration-package.js';
import { MigrationStatus } from './types.js';

export interface DbMigratorOptions {
  connection: ClientConfiguration;
  migrationPackage: MigrationPackage | MigrationPackageConfig;
  infoSchema?: string;
  scriptVariables?: Record<string, string>;
  targetVersion?: number;
}

export class DbMigrator extends AsyncEventEmitter {
  declare protected adapter: MigrationAdapter;

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
      options?.targetVersion || Number.MAX_SAFE_INTEGER,
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
                schema: options.connection.schema,
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
