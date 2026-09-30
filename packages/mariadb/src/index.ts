/**
 * @sqb/mariadb - `@sqb/connect` database driver for MariaDB, backed by the
 * `mariadb` npm package.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link MariadbAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/mariadb-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'mariadb', ... })`
 * work.
 */
import '@sqb/mariadb-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { MariadbAdapter } from './mariadb-adapter.js';

export * from './constants.js';
export * from './mariadb-adapter.js';
export * from './mariadb-connection.js';
export * from './mariadb-cursor.js';

AdapterRegistry.register(new MariadbAdapter());
