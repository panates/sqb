import { EntityMetadata } from '../model/entity-metadata.js';
import { ColumnTransformFunction } from '../orm.type.js';

export function Parse(fn: ColumnTransformFunction): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const entity = EntityMetadata.define(target.constructor);
    EntityMetadata.defineColumnField(entity, propertyKey).parse = fn;
  };
}

export function Serialize(fn: ColumnTransformFunction): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('You can define a Column for only string properties');
    const entity = EntityMetadata.define(target.constructor);
    EntityMetadata.defineColumnField(entity, propertyKey).serialize = fn;
  };
}
