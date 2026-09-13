import { EntityMetadata } from '../model/entity-metadata.js';
import type { ColumnTransformFunction } from '../orm.type.js';

/**
 * Registers a transform applied to the column's value when reading a row
 * back from the database (before it's assigned onto the result object).
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function Parse(fn: ColumnTransformFunction): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const entity = EntityMetadata.define(target.constructor);
    EntityMetadata.defineColumnField(entity, propertyKey).parse = fn;
  };
}

/**
 * Registers a transform applied to the column's value before writing it to
 * the database (during `create`/`update`).
 *
 * @throws {Error} If applied to a symbol-keyed property.
 */
export function Serialize(fn: ColumnTransformFunction): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const entity = EntityMetadata.define(target.constructor);
    EntityMetadata.defineColumnField(entity, propertyKey).serialize = fn;
  };
}
