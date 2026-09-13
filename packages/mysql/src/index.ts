/**
 * @sqb/mysql - `@sqb/connect` database driver for MySQL, backed by the
 * `mysql2` npm package.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link MysqlAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/mysql-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'mysql', ... })`
 * work.
 */
import '@sqb/mysql-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { MysqlAdapter } from './mysql-adapter.js';

export * from './mysql-adapter.js';
export * from './mysql-connection.js';
export * from './mysql-cursor.js';

AdapterRegistry.register(new MysqlAdapter());
