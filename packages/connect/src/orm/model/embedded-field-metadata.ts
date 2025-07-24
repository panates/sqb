import { TypeThunk } from '../orm.type.js';
import { resolveEntityMeta } from '../util/orm.helper.js';
import type { EntityMetadata } from './entity-metadata.js';
import { FieldMetadata } from './field-metadata.js';

export type EmbeddedFieldOptions = Partial<
  Omit<EmbeddedFieldMetadata, 'entity' | 'name' | 'kind' | 'type'>
>;

export interface EmbeddedFieldMetadata extends FieldMetadata {
  readonly kind: 'object';
  type: TypeThunk;
  fieldNamePrefix?: string;
  fieldNameSuffix?: string;
}

export namespace EmbeddedFieldMetadata {
  export function create(
    entity: EntityMetadata,
    name: string,
    type: TypeThunk,
    options?: EmbeddedFieldOptions,
  ): EmbeddedFieldMetadata {
    const result: EmbeddedFieldMetadata = {
      kind: 'object',
      entity,
      name,
      type,
    };
    if (options?.fieldNamePrefix)
      result.fieldNamePrefix = options.fieldNamePrefix;
    if (options?.fieldNameSuffix)
      result.fieldNameSuffix = options.fieldNameSuffix;
    return result;
  }

  export async function resolveType(
    meta: EmbeddedFieldMetadata,
  ): Promise<EntityMetadata> {
    const typ = await resolveEntityMeta(meta.type);
    if (typ) return typ;
    throw new Error(`Can't resolve type of ${meta.entity.name}.${meta.name}`);
  }
}
