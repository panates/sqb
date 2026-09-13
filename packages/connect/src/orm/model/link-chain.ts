import type { Type } from 'ts-gems';
import type { TypeResolver, TypeThunk } from '../orm.type.js';
import { AssociationNode } from './association-node.js';

/**
 * Builder used internally by the `@Link(...)` decorator's
 * `.toOne(...)`/`.toMany(...)` chain to assemble a linked list of
 * {@link AssociationNode}s - one per hop - culminating in the
 * `AssociationFieldMetadata` attached to the decorated property.
 */
export class LinkChain<T> {
  /** The first hop in the chain. */
  first: AssociationNode;
  /** The most recently added hop (where `.where(...)`/the next `.linkToOne()`/`.linkToMany()` call applies). */
  current: AssociationNode;

  /**
   * @param target - The entity this (first hop of the) chain points to.
   * @param targetKey - The target-side key column for this hop; auto-resolved if omitted.
   * @param sourceKey - The source-side key column for this hop; auto-resolved if omitted.
   * @param many - Whether this hop is a to-many relation.
   */
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

  /** Adds extra filter condition(s) to the current (most recently added) hop. */
  where(conditions: object | object[]): this {
    this.current.conditions = this.current.conditions || [];
    if (Array.isArray(conditions)) this.current.conditions.push(...conditions);
    else this.current.conditions.push(conditions);
    return this;
  }

  /** Chains a to-one hop onto the current end of the chain. */
  linkToOne<K>(
    target: Type<K> | TypeResolver<K>,
    targetColumn?: keyof K,
    parentColumn?: keyof T,
  ): LinkChain<K> {
    return this._newNode(target, targetColumn, parentColumn);
  }

  /** Chains a to-many hop onto the current end of the chain. */
  linkToMany<K>(
    target: Type<K> | TypeResolver<K>,
    targetColumn?: keyof K,
    parentColumn?: keyof T,
  ): LinkChain<K> {
    return this._newNode(target, targetColumn, parentColumn, true);
  }

  /** Appends a new hop after `current`, linking it in and advancing `current` to it. */
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
