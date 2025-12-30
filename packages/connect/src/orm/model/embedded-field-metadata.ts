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
  export async function resolveType(
    meta: EmbeddedFieldMetadata,
  ): Promise<EntityMetadata> {
    const typ = await resolveEntityMeta(meta.type);
    if (typ) return typ;
    throw new Error(`Can't resolve type of ${meta.entity.name}.${meta.name}`);
  }
}
