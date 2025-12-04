import glob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { PartialSome, StrictOmit } from 'ts-gems';
import type { MigrationAdapter } from './migration-adapter.js';
import { getCallingFilename } from './utils/get-calling-filename.js';

export interface MigrationPackage {
  name: string;
  description?: string;
  migrations: Migration[];
  baseDir: string;
  informationTableName?: string;
}

export interface Migration {
  version: number;
  tasks: MigrationTask[];
  baseDir: string;
  backup?: boolean;
}

export type MigrationTask =
  | SqlScriptMigrationTask
  | CustomMigrationTask
  | InsertDataMigrationTask;

export interface BaseMigrationTask {
  title?: string;
  filename?: string;
}

export interface SqlScriptMigrationTask extends BaseMigrationTask {
  script: string | Function;
}

export interface InsertDataMigrationTask extends BaseMigrationTask {
  tableName: string;
  rows: Record<string, any>[];
}

export interface CustomMigrationTask extends BaseMigrationTask {
  fn: (connection: any, adapter: MigrationAdapter) => void | Promise<void>;
}

export function isSqlScriptMigrationTask(x: any): x is SqlScriptMigrationTask {
  return (
    typeof x === 'object' &&
    (typeof x.script === 'string' || typeof x.script === 'function')
  );
}

export function isInsertDataMigrationTask(
  x: any,
): x is InsertDataMigrationTask {
  return (
    typeof x === 'object' &&
    typeof x.tableName === 'string' &&
    Array.isArray(x.rows)
  );
}

export function isCustomMigrationTask(x: any): x is CustomMigrationTask {
  return typeof x === 'object' && typeof x.fn === 'function';
}

export interface MigrationPackageConfig extends PartialSome<
  StrictOmit<MigrationPackage, 'migrations'>,
  'baseDir'
> {
  migrations: (
    | string
    | MigrationConfig
    | (() => MigrationConfig)
    | (() => Promise<MigrationConfig>)
  )[];
}

export interface MigrationConfig extends StrictOmit<
  Migration,
  'tasks' | 'baseDir'
> {
  tasks: (
    | string
    | MigrationTask
    | (() => MigrationTask)
    | (() => Promise<MigrationTask>)
  )[];
}

export namespace MigrationPackage {
  export async function load(
    asyncConfig: MigrationPackageConfig,
  ): Promise<MigrationPackage> {
    const baseDir = asyncConfig.baseDir || path.dirname(getCallingFilename(1));

    const out: MigrationPackage = {
      ...asyncConfig,
      baseDir,
      migrations: [],
    };

    if (!Array.isArray(asyncConfig.migrations)) {
      throw new TypeError(
        'You must provide array of MigrationConfig in "migrations" property',
      );
    }

    if (asyncConfig.migrations?.length) {
      const srcMigrations: MigrationConfig[] = [];
      const trgMigrations: Migration[] = [];
      out.migrations = trgMigrations;
      let x: any;
      for (x of asyncConfig.migrations) {
        x = typeof x === 'function' ? await x() : x;
        if (typeof x === 'object' && x.tasks) srcMigrations.push(x);
        else if (typeof x === 'string') {
          srcMigrations.push(
            ...(await loadMigrations(baseDir, x.replace(/\\/g, '/'))),
          );
        }
      }

      srcMigrations.sort((a, b) => a.version - b.version);

      for (const migration of srcMigrations) {
        const trgMigration: Migration = {
          baseDir: '',
          ...migration,
          tasks: [],
        };
        trgMigrations.push(trgMigration);
        const srcTasks = migration.tasks;
        trgMigration.tasks = [];
        for (const t of srcTasks) {
          if (typeof t === 'object') {
            trgMigration.tasks.push(t);
          } else if (typeof t === 'string') {
            let pattern = t.replace(/\\/g, '/');
            pattern = path.resolve(
              path.join(baseDir, trgMigration.baseDir, pattern),
            );
            const files = await glob(pattern, {
              absolute: true,
              onlyFiles: true,
            });
            files.sort();
            for (const filename of files) {
              const ext = path.extname(filename).toLowerCase();
              if (!path.basename(filename, ext).endsWith('.task')) continue;
              if (ext === '.sql') {
                const script = await fs.readFile(filename, 'utf-8');
                trgMigration.tasks.push({
                  title: path.basename(filename, ext),
                  filename,
                  script,
                } satisfies SqlScriptMigrationTask);
              } else if (
                ['.json', '.js', '.ts', '.cjs', '.mjs'].includes(ext)
              ) {
                try {
                  let json: any =
                    ext === '.json'
                      ? JSON.parse(await fs.readFile(filename, 'utf-8'))
                      : await import(filename);
                  if (typeof json !== 'object') continue;
                  if (json.__esModule) json = json.default;
                  if (json.script) {
                    json.title = json.title || 'Run sql script';
                    json.filename = filename;
                    trgMigration.tasks.push(
                      json satisfies SqlScriptMigrationTask,
                    );
                    continue;
                  }
                  if (json.tableName && json.rows) {
                    json.title =
                      json.title || 'Migrate data into ' + json.tableName;
                    json.filename = filename;
                    trgMigration.tasks.push(
                      json satisfies InsertDataMigrationTask,
                    );
                    continue;
                  }
                  if (typeof json.fn === 'function') {
                    json.title = json.title || 'Run custom function';
                    json.filename = filename;
                    trgMigration.tasks.push(json satisfies CustomMigrationTask);
                  }
                } catch (e: any) {
                  e.message = `Error in ${filename}\n` + e.message;
                  throw e;
                }
              }
            }
          }
        }
      }
    }

    return out;
  }
}

async function loadMigrations(
  baseDir: string,
  pattern: string,
): Promise<Migration[]> {
  const out: Migration[] = [];
  const files = await glob(path.join(baseDir, pattern), {
    absolute: true,
    onlyFiles: true,
  });
  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase();
    if (path.basename(filename, ext) !== 'migration') continue;
    let json: any;
    if (['.js', '.ts', '.cjs', '.mjs', 'mts', 'cts'].includes(ext)) {
      json = await import(filename);
      if (json.default?.version) json = json.default;
    } else if (ext === '.json') {
      try {
        json = JSON.parse(await fs.readFile(filename, 'utf-8'));
      } catch (e: any) {
        e.message = `Error in ${filename}\n` + e.message;
        throw e;
      }
    }
    if (
      json &&
      typeof json === 'object' &&
      json.version &&
      Array.isArray(json.tasks)
    ) {
      json.baseDir = path.relative(baseDir, path.dirname(filename));
      out.push(json);
    }
  }
  return out;
}
