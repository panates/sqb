import { AssociationNode } from './orm/model/association-node.js';

/**
 * Duck-types whether `v` is an {@link AssociationNode} (checked structurally,
 * by the presence of its distinctive methods, rather than `instanceof` -
 * used where an `Association` vs. `AssociationNode` distinction matters but
 * importing the class directly would be inconvenient).
 */
export function isAssociationNode(v: any): v is AssociationNode {
  if (!(v && typeof v === 'object')) return false;
  const proto = Object.getPrototypeOf(v);
  return (
    typeof proto.getFirst === 'function' &&
    typeof proto.getLast === 'function' &&
    typeof proto.returnsMany === 'function'
  );
}
