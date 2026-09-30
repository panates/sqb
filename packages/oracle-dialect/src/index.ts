/**
 * @sqb/oracle-dialect - `@sqb/builder` SQL serializer extension for
 * Oracle Database.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link OracleSerializer} with `@sqb/builder`'s `SerializerRegistry` as a
 * side effect, making `.generate({ dialect: 'oracle' })` produce Oracle
 * SQL.
 */
import { SerializerRegistry } from '@sqb/builder';
import { OracleSerializer } from './oracle-serializer.js';

SerializerRegistry.register(new OracleSerializer());

export * from './constants.js';
