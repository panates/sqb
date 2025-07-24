import { Association } from './association.js';

export class AssociationNode extends Association {
  prior?: AssociationNode;
  next?: AssociationNode;
  conditions?: any[];

  getFirst(): AssociationNode {
    let l: AssociationNode = this;
    while (l.prior) l = l.prior;
    return l;
  }

  getLast(): AssociationNode {
    let l: AssociationNode = this;
    while (l.next) l = l.next;
    return l;
  }

  returnsMany(): boolean {
    const n = super.returnsMany();
    if (n) return n;
    return !!(this.next && this.next.returnsMany());
  }
}
