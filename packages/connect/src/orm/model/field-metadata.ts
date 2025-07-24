import type { FieldKind } from '../orm.type.js';
import type { EntityMetadata } from './entity-metadata.js';

export interface FieldMetadata {
  readonly entity: EntityMetadata;
  readonly name: string;
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
