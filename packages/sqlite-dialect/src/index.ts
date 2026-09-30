/**
 * @sqb/sqlite-dialect - `@sqb/builder` SQL serializer extension for
 * SQLite.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link SqliteSerializer} with `@sqb/builder`'s `SerializerRegistry` as a
 * side effect, making `.generate({ dialect: 'sqlite' })` produce SQLite
 * SQL.
 */
import { SerializerRegistry } from '@sqb/builder';
import { SqliteSerializer } from './sqlite-serializer.js';

SerializerRegistry.register(new SqliteSerializer());

export * from './constants.js';
