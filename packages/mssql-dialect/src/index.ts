/**
 * @sqb/mssql-dialect - `@sqb/builder` SQL serializer extension for
 * Microsoft SQL Server (T-SQL).
 *
 * Importing this package (even without using any of its exports) registers
 * {@link MSSqlSerializer} with `@sqb/builder`'s `SerializerRegistry` as a
 * side effect, making `.generate({ dialect: 'mssql' })` produce T-SQL.
 */
import { SerializerRegistry } from '@sqb/builder';
import { MSSqlSerializer } from './ms-sql-serializer.js';

SerializerRegistry.register(new MSSqlSerializer());
