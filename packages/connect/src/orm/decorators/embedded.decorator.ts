import { EmbeddedFieldOptions } from '../model/embedded-field-metadata.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import { TypeThunk } from '../orm.type.js';

export function Embedded(
  type?: TypeThunk,
  options?: EmbeddedFieldOptions,
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string')
      throw new Error('Symbol properties are not accepted');

    type = type || Reflect.getMetadata('design:type', target, propertyKey);
    if (typeof type !== 'function') throw new Error('"type" must be defined');

    const entity = EntityMetadata.define(target.constructor);
    EntityMetadata.defineEmbeddedField(entity, propertyKey, type, options);
  };
}
