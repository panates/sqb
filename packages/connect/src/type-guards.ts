import { AssociationNode } from './orm/model/association-node.js';

export function isAssociationNode(v: any): v is AssociationNode {
  if (!(v && typeof v === 'object')) return false;
  const proto = Object.getPrototypeOf(v);
  return (
    typeof proto.getFirst === 'function' &&
    typeof proto.getLast === 'function' &&
    typeof proto.returnsMany === 'function'
  );
}
