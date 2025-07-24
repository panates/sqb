import { Type } from 'ts-gems';
import { TypeResolver, TypeThunk } from '../orm.type.js';
import { AssociationNode } from './association-node.js';

export class LinkChain<T> {
  first: AssociationNode;
  current: AssociationNode;

  constructor(
    public target: TypeThunk<T>,
    targetKey?: keyof T,
    sourceKey?: string,
    many?: boolean,
  ) {
    this.first = this.current = new AssociationNode('', {
      many,
      target,
      source: null as unknown as Type,
      sourceKey,
      targetKey: targetKey as string,
    });
  }

  where(conditions: object | object[]): this {
    this.current.conditions = this.current.conditions || [];
    if (Array.isArray(conditions)) this.current.conditions.push(...conditions);
    else this.current.conditions.push(conditions);
    return this;
  }

  linkToOne<K>(
    target: Type<K> | TypeResolver<K>,
    targetColumn?: keyof K,
    parentColumn?: keyof T,
  ): LinkChain<K> {
    return this._newNode(target, targetColumn, parentColumn);
  }

  linkToMany<K>(
    target: Type<K> | TypeResolver<K>,
    targetColumn?: keyof K,
    parentColumn?: keyof T,
  ): LinkChain<K> {
    return this._newNode(target, targetColumn, parentColumn, true);
  }

  private _newNode<K>(
    target: Type<K> | TypeResolver<K>,
    targetKey?: keyof K,
    parentKey?: keyof T,
    many = false,
  ): LinkChain<K> {
    const child = new AssociationNode(this.current.name, {
      many,
      source: this.current.target,
      target,
      sourceKey: parentKey as string,
      targetKey: targetKey as string,
    });
    child.prior = this.current;
    this.current.next = child;
    this.current = child;
    return this as unknown as LinkChain<K>;
  }
}
