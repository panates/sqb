/**
 * @sqb/sqljs - `@sqb/connect` database driver for SQLite, backed by the
 * pure-WASM `sql.js` npm package (no native module/build step needed).
 *
 * Importing this package (even without using any of its exports) registers
 * {@link SqljsAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/sqlite-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'sqlite', driver:
 * 'sqljs', ... })` work.
 */
import { AdapterRegistry } from '@sqb/connect';
import { SqljsAdapter } from './sqljs-adapter.js';

export * from './sqljs-adapter.js';
export * from './sqljs-connection.js';
export * from './sqljs-cursor.js';

AdapterRegistry.register(new SqljsAdapter());
