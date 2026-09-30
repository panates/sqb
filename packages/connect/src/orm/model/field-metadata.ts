import type { FieldKind } from '../orm.type.js';
import type { EntityMetadata } from './entity-metadata.js';

/**
 * Base shape shared by every entity field descriptor - {@link ColumnFieldMetadata}
 * (a plain data column), {@link EmbeddedFieldMetadata} (a nested sub-object),
 * and {@link AssociationFieldMetadata} (a relation to another entity),
 * distinguished by `kind`.
 */
export interface FieldMetadata {
  /** The entity this field belongs to. */
  readonly entity: EntityMetadata;
  /** The field's property name on the entity class. */
  readonly name: string;
  /** Discriminates which concrete field-metadata variant this is. */
  readonly kind: FieldKind;

  /**
   * Indicates whether or not to hide this field by default when making queries.
   */
  hidden?: boolean;

  /**
   * Indicates whether or not to include this field by default when making queries.
   * If this set to "true" the field must be requested using "projection" option.
   */
  exclusive?: boolean;
}
