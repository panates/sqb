/**
 * @sqb/mysql-dialect - `@sqb/builder` SQL serializer extension for MySQL.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link MysqlSerializer} with `@sqb/builder`'s `SerializerRegistry` as a
 * side effect, making `.generate({ dialect: 'mysql' })` produce MySQL SQL.
 */
import { SerializerRegistry } from '@sqb/builder';
import { MysqlSerializer } from './mysql-serializer.js';

SerializerRegistry.register(new MysqlSerializer());
