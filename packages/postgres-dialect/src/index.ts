/**
 * @sqb/postgres-dialect - `@sqb/builder` SQL serializer extension for
 * PostgreSQL.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link PostgresSerializer} with `@sqb/builder`'s `SerializerRegistry` as
 * a side effect, making `.generate({ dialect: 'postgres' })` produce
 * PostgreSQL SQL.
 */
import { SerializerRegistry } from '@sqb/builder';
import { PostgresSerializer } from './postgres-serializer.js';

SerializerRegistry.register(new PostgresSerializer());

export * from './constants.js';
