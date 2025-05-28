import _ from 'lodash';
import { AssociationNode } from './association-node.js';
import { EntityMetadata } from './entity-metadata.js';
import { FieldMetadata } from './field-metadata.js';

export type AssociationFieldOptions = Partial<
  Omit<AssociationFieldMetadata, 'entity' | 'name' | 'kind' | 'association'>
>;

export interface AssociationFieldMetadata extends FieldMetadata {
  readonly kind: 'association';
  readonly association: AssociationNode;
}

export namespace AssociationFieldMetadata {
  export function create(
    entity: EntityMetadata,
    name: string,
    association: AssociationNode,
    options: AssociationFieldOptions = {},
  ): AssociationFieldMetadata {
    const result: AssociationFieldMetadata = {
      kind: 'association',
      entity,
      name,
      association,
    };
    if (options) AssociationFieldMetadata.assign(result, options);
    return result;
  }

  export function assign(
    target: AssociationFieldMetadata,
    options: AssociationFieldOptions,
  ) {
    Object.assign(
      target,
      _.omit(options, ['entity', 'name', 'kind', 'association']),
    );
  }
}
