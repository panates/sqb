import { EntityMetadata } from '../model/entity-metadata.js';
import { TypeThunk } from '../orm.type.js';

export function ForeignKey(
  type: TypeThunk,
  targetKey?: string,
): PropertyDecorator {
  return function (
    target: Object | Function,
    propertyKey?: string | symbol,
  ): void {
    if (typeof propertyKey !== 'string')
      throw new Error('Symbol properties are not accepted');
    const entity = EntityMetadata.define(target.constructor);
    EntityMetadata.addForeignKey(entity, propertyKey, type, targetKey);
  };
}
