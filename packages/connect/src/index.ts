/**
 * @sqb/connect - a connection-pooling database client and lightweight ORM
 * built on top of `@sqb/builder`.
 *
 * Re-exports the client layer (`SqbClient`, `SqbConnection`, `Cursor`,
 * `Adapter`, connection/query option types) for direct SQL execution, and
 * the ORM layer (`@Entity`/`@Column`/`@Link`/... decorators, `EntityMetadata`,
 * `Repository`, `BaseEntity`) for working with decorated entity classes.
 * Imports `reflect-metadata` as a side effect, required by the decorators'
 * use of `Reflect.getMetadata`/`Reflect.defineMetadata`.
 */
import 'reflect-metadata';

export * from './client/adapter.js';
export * from './client/cursor.js';
export * from './client/extensions.js';
export * from './client/sqb-client.js';
export * from './client/sqb-connection.js';
export * from './client/sqb-error.js';
export * from './client/types.js';
export * from './constants.js';
export * from './orm/base-entity.js';
export * from './orm/decorators/column.decorator.js';
export * from './orm/decorators/embedded.decorator.js';
export * from './orm/decorators/entity.decorator.js';
export * from './orm/decorators/events.decorator.js';
export * from './orm/decorators/foreignkey.decorator.js';
export * from './orm/decorators/index.decorator.js';
export * from './orm/decorators/link.decorator.js';
export * from './orm/decorators/primarykey.decorator.js';
export * from './orm/decorators/transform.decorator.js';
export * from './orm/model/association.js';
export * from './orm/model/association-field-metadata.js';
export * from './orm/model/association-node.js';
export * from './orm/model/column-field-metadata.js';
export * from './orm/model/embedded-field-metadata.js';
export * from './orm/model/entity-metadata.js';
export * from './orm/model/field-metadata.js';
export * from './orm/model/index-metadata.js';
export * from './orm/model/link-chain.js';
export * from './orm/orm.const.js';
export * from './orm/orm.type.js';
export * from './orm/repository.class.js';
export {
  isAssociationField,
  isColumnField,
  isEmbeddedField,
  isEntityClass,
} from './orm/util/orm.helper.js';
export * from './orm/util/parse-fields-projection.js';
