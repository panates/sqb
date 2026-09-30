/**
 * @sqb/migrator - a versioned, dialect-agnostic SQL migration runner for
 * `@sqb/connect`-supported databases.
 *
 * A {@link MigrationPackage} (a set of numbered {@link Migration}s, each
 * with SQL-script/insert-data/custom-function {@link MigrationTask}s) is
 * applied to a target database by {@link DbMigrator.execute}, which picks
 * the {@link MigrationAdapter} implementation matching the connection's
 * dialect (see `db-migrator.ts`) and tracks applied versions in a per-
 * database bookkeeping table that adapter creates and maintains.
 */
export * from './constants.js';
export * from './db-migrator.js';
export * from './migration-adapter.js';
export * from './migration-package.js';
export * from './types.js';
