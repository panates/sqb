/**
 * @sqb/postgres - `@sqb/connect` database driver for PostgreSQL, backed by
 * the `postgrejs` npm package.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link PgAdapter} with `@sqb/connect`'s `AdapterRegistry` as a side
 * effect (and, via `@sqb/postgres-dialect`, `@sqb/builder`'s
 * `SerializerRegistry`), making `new SqbClient({ dialect: 'postgres', ...
 * })` work.
 */
import '@sqb/postgres-dialect';
import { AdapterRegistry } from '@sqb/connect';
import { PgAdapter } from './pg-adapter.js';

AdapterRegistry.register(new PgAdapter());

export * from './pg-adapter.js';
