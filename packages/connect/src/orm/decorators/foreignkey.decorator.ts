import { EntityMetadata } from '../model/entity-metadata.js';
import type { TypeThunk } from '../orm.type.js';

/**
 * Declares that the decorated column references another entity, without
 * exposing the relation as its own property (unlike `@Link`) - used purely
 * to let `@Link`/association resolution auto-detect join keys between two
 * entities instead of requiring `sourceKey`/`targetKey` to be spelled out
 * explicitly.
 *
 * @param type - The referenced entity type (or a thunk resolving to one).
 * @param targetKey - The referenced entity's key column; defaults to its primary key if omitted.
 * @throws {Error} If applied to a symbol-keyed property.
 */
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
