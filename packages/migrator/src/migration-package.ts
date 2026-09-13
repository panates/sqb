import glob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import type { PartialSome, StrictOmit } from 'ts-gems';
import type { MigrationAdapter } from './migration-adapter.js';
import { getCallingFilename } from './utils/get-calling-filename.js';

/** A fully-resolved migration package: a name plus an ordered list of {@link Migration}s, ready to hand to {@link DbMigrator.execute}. Produced from a {@link MigrationPackageConfig} by {@link MigrationPackage.load}. */
export interface MigrationPackage {
  name: string;
  description?: string;
  migrations: Migration[];
  baseDir: string;
  informationTableName?: string;
}

/** One numbered migration step: a target schema `version` plus the ordered {@link MigrationTask}s that get the database there. */
export interface Migration {
  version: number;
  tasks: MigrationTask[];
  baseDir: string;
  /** If `true`, {@link DbMigrator.execute} backs up the database (via the adapter's `backupDatabase()`) before running this migration and restores it (`restoreDatabase()`) if any task in the run fails. */
  backup?: boolean;
}

/** A single migration step: a raw SQL script, a batch of rows to insert, or an arbitrary function - see {@link isSqlScriptMigrationTask}/{@link isInsertDataMigrationTask}/{@link isCustomMigrationTask} to narrow one. */
export type MigrationTask =
  SqlScriptMigrationTask | CustomMigrationTask | InsertDataMigrationTask;

/** Fields common to every {@link MigrationTask} kind. */
export interface BaseMigrationTask {
  title?: string;
  filename?: string;
}

/** A task that runs a raw SQL script (dialect-specific text, with `$(name)` variables substituted before execution) against the target database - or a function producing one, given the current migration context. */
export interface SqlScriptMigrationTask extends BaseMigrationTask {
  script: string | Function;
}

/** A task that inserts a fixed set of rows into `tableName`, one `INSERT` per row (built via `@sqb/builder` for the target dialect). */
export interface InsertDataMigrationTask extends BaseMigrationTask {
  tableName: string;
  rows: Record<string, any>[];
}

/** A task that runs an arbitrary function against the raw driver connection, for anything the other task kinds can't express. */
export interface CustomMigrationTask extends BaseMigrationTask {
  fn: (connection: any, adapter: MigrationAdapter) => void | Promise<void>;
}

/** Narrows a {@link MigrationTask} to {@link SqlScriptMigrationTask}. */
export function isSqlScriptMigrationTask(x: any): x is SqlScriptMigrationTask {
  return (
    typeof x === 'object' &&
    (typeof x.script === 'string' || typeof x.script === 'function')
  );
}

/** Narrows a {@link MigrationTask} to {@link InsertDataMigrationTask}. */
export function isInsertDataMigrationTask(
  x: any,
): x is InsertDataMigrationTask {
  return (
    typeof x === 'object' &&
    typeof x.tableName === 'string' &&
    Array.isArray(x.rows)
  );
}

/** Narrows a {@link MigrationTask} to {@link CustomMigrationTask}. */
export function isCustomMigrationTask(x: any): x is CustomMigrationTask {
  return typeof x === 'object' && typeof x.fn === 'function';
}

/**
 * The user-authored shape of a migration package, as passed to
 * {@link DbMigrator.execute} - each entry in `migrations` is either an
 * inline {@link MigrationConfig}, a function producing one, or a glob
 * pattern (relative to `baseDir`) matched against `migration.*` files (see
 * {@link MigrationPackage.load}). Resolved into a {@link MigrationPackage}
 * before use.
 */
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

/**
 * The user-authored shape of one {@link Migration} - each entry in `tasks`
 * is either an inline {@link MigrationTask}, a function producing one, or
 * a glob pattern matched against `*.task.{sql,json,js,ts,cjs,mjs}` files
 * (see {@link MigrationPackage.load}).
 */
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
  /**
   * Resolves a {@link MigrationPackageConfig} into a fully-loaded
   * {@link MigrationPackage}: expands each `migrations` entry (an inline
   * config, a factory function, or a glob matched against `migration.*`
   * files via {@link loadMigrations}) into a {@link Migration}, sorts them
   * by version, and expands each migration's `tasks` entries the same way
   * (a glob here instead matches `*.task.sql`/`*.task.json`/`*.task.js`/
   * `*.task.ts`/`*.task.cjs`/`*.task.mjs` files, sorted by filename).
   * `baseDir` defaults to the directory of the file that called this
   * function (via {@link getCallingFilename}) when not given explicitly.
   *
   * @throws {TypeError} if `asyncConfig.migrations` isn't an array
   * @throws {Error} if two migrations declare the same `version`, or a task file fails to load/parse
   */
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

      const seenVersions = new Set<number>();
      for (const m of srcMigrations) {
        if (seenVersions.has(m.version))
          throw new Error(
            `Migration package "${asyncConfig.name}" has more than one migration defined for version ${m.version}`,
          );
        seenVersions.add(m.version);
      }

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

/**
 * Globs for `migration.{js,ts,cjs,mjs,mts,cts,json}` files matching
 * `pattern` under `baseDir`, importing (or, for `.json`, parsing) each one
 * and keeping those that look like a {@link MigrationConfig} (a numeric
 * `version` plus a `tasks` array). Each result's `baseDir` is set to its
 * containing directory, relative to the package's own `baseDir`, so a
 * task glob declared on it resolves relative to where the migration file
 * itself lives rather than the package root.
 *
 * @throws {Error} if a matched `.json` file fails to parse
 */
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
