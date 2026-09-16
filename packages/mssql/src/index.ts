/**
 * @sqb/mssql - `@sqb/connect` database driver for Microsoft SQL Server,
 * backed by the `mssql` (tedious) npm package.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link MssqlAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/mssql-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'mssql', ... })`
 * work.
 */
import '@sqb/mssql-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { MssqlAdapter } from './mssql-adapter.js';

export * from './constants.js';
export * from './mssql-adapter.js';
export * from './mssql-connection.js';
export * from './mssql-cursor.js';

AdapterRegistry.register(new MssqlAdapter());
