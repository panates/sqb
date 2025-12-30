import { AssociationNode } from './association-node.js';
import { FieldMetadata } from './field-metadata.js';

export type AssociationFieldOptions = Partial<
  Omit<AssociationFieldMetadata, 'entity' | 'name' | 'kind' | 'association'>
>;

export interface AssociationFieldMetadata extends FieldMetadata {
  readonly kind: 'association';
  readonly association: AssociationNode;
}
