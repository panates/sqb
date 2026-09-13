import { AssociationNode } from './association-node.js';
import type { FieldMetadata } from './field-metadata.js';

/** Options accepted by the `@Link(...)` decorator. */
export type AssociationFieldOptions = Partial<
  Omit<AssociationFieldMetadata, 'entity' | 'name' | 'kind' | 'association'>
>;

/**
 * Metadata describing one `@Link`-decorated field: a relation to another
 * entity (possibly chained through several hops), resolved at query time
 * via a `JOIN` (to-one) or a correlated sub-query/eager fetch (to-many).
 */
export interface AssociationFieldMetadata extends FieldMetadata {
  readonly kind: 'association';
  /** The (possibly chained) association this field resolves through. */
  readonly association: AssociationNode;
}
