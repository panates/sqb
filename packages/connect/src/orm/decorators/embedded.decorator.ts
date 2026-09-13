import type { EmbeddedFieldOptions } from '../model/embedded-field-metadata.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import type { TypeThunk } from '../orm.type.js';

/**
 * Marks a property as an embedded entity: another `@Entity`-decorated
 * class's columns, mapped inline onto the parent's own table row (see
 * {@link EmbeddedFieldOptions.fieldNamePrefix}/`fieldNameSuffix`).
 *
 * @param type - The embedded entity type (or a thunk resolving to one); inferred from the property's TS type via `reflect-metadata` if omitted.
 * @throws {Error} If applied to a symbol-keyed property, or if `type` can't be determined.
 */
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
