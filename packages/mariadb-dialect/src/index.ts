/**
 * @sqb/mariadb-dialect - MariaDB-specific `@sqb/builder` SQL serialization.
 *
 * Importing this package (even without using any of its exports) registers
 * {@link MariadbSerializer} with `@sqb/builder`'s `SerializerRegistry` as a
 * side effect, making `generate({ dialect: 'mariadb' })` produce
 * MariaDB-correct SQL.
 */
import { SerializerRegistry } from '@sqb/builder';
import { MariadbSerializer } from './mariadb-serializer.js';

SerializerRegistry.register(new MariadbSerializer());

export * from './constants.js';
