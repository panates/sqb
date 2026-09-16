/**
 * @sqb/sqlite - `@sqb/connect` database driver for SQLite, backed by
 * Node's built-in `node:sqlite` or, when running under Bun, `bun:sqlite`.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link SqliteAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/sqlite-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'sqlite', ...
 * })` work.
 */
import '@sqb/sqlite-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { SqliteAdapter } from './sqlite-adapter.js';

export * from './constants.js';
export * from './sqlite-adapter.js';
export * from './sqlite-connection.js';
export * from './sqlite-cursor.js';

AdapterRegistry.register(new SqliteAdapter());
