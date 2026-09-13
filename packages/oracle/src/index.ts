/**
 * @sqb/oracle - `@sqb/connect` database driver for Oracle Database, backed
 * by the `oracledb` npm package.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link OraAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/oracle-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'oracle', ... })`
 * work.
 */
import '@sqb/oracle-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { OraAdapter } from './ora-adapter.js';

export * from './constants.js';
export * from './ora-adapter.js';
export * from './ora-connection.js';

AdapterRegistry.register(new OraAdapter());
