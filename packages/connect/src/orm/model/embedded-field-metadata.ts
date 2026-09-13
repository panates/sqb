import type { TypeThunk } from '../orm.type.js';
import { resolveEntityMeta } from '../util/orm.helper.js';
import type { EntityMetadata } from './entity-metadata.js';
import type { FieldMetadata } from './field-metadata.js';

/** Options accepted by the `@Embedded(...)` decorator. */
export type EmbeddedFieldOptions = Partial<
  Omit<EmbeddedFieldMetadata, 'entity' | 'name' | 'kind' | 'type'>
>;

/**
 * Metadata describing one `@Embedded`-decorated field: a nested entity
 * whose own columns are flattened into (and read back from) the parent
 * entity's table row, optionally with a name prefix/suffix.
 */
export interface EmbeddedFieldMetadata extends FieldMetadata {
  readonly kind: 'object';
  /** The embedded entity type (or a thunk resolving to one). */
  type: TypeThunk;
  /** Prepended to each embedded field's own table column name. */
  fieldNamePrefix?: string;
  /** Appended to each embedded field's own table column name. */
  fieldNameSuffix?: string;
}

export namespace EmbeddedFieldMetadata {
  /**
   * Resolves `meta.type` to its {@link EntityMetadata}.
   *
   * @throws {Error} If `meta.type` doesn't resolve to an `@Entity`-decorated class.
   */
  export async function resolveType(
    meta: EmbeddedFieldMetadata,
  ): Promise<EntityMetadata> {
    const typ = await resolveEntityMeta(meta.type);
    if (typ) return typ;
    throw new Error(`Can't resolve type of ${meta.entity.name}.${meta.name}`);
  }
}
