import { Association } from './association.js';

/**
 * One hop in a (possibly multi-hop) association chain, as built by
 * {@link LinkChain} for a `@Link().toOne(...).toMany(...)`-style
 * declaration. Each node is a full {@link Association} in its own right
 * (source/target/keys), linked to its neighbors via `prior`/`next`.
 */
export class AssociationNode extends Association {
  /** The previous hop in the chain, if this isn't the first. */
  prior?: AssociationNode;
  /** The next hop in the chain, if this isn't the last. */
  next?: AssociationNode;
  /** Extra filter conditions applied at this hop (from `.where(...)` in the `@Link` chain). */
  conditions?: any[];

  /** Walks `prior` links back to the first node in the chain. */
  getFirst(): AssociationNode {
    let l: AssociationNode = this;
    while (l.prior) l = l.prior;
    return l;
  }

  /** Walks `next` links forward to the last node in the chain. */
  getLast(): AssociationNode {
    let l: AssociationNode = this;
    while (l.next) l = l.next;
    return l;
  }

  /** Whether this hop, or any later hop in the chain, is a to-many relation. */
  returnsMany(): boolean {
    const n = super.returnsMany();
    if (n) return n;
    return !!(this.next && this.next.returnsMany());
  }
}
