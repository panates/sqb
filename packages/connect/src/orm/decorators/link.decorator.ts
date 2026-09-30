import type { Type } from 'ts-gems';
import type { AssociationFieldOptions } from '../model/association-field-metadata.js';
import { EntityMetadata } from '../model/entity-metadata.js';
import { LinkChain } from '../model/link-chain.js';
import type { TypeThunk } from '../orm.type.js';

/** Arguments for one hop of a `@Link().toOne(...)`/`.toMany(...)` chain. */
type LinkArgs<T> = {
  /** The source-side key column for this hop; auto-resolved if omitted. */
  sourceKey?: string;
  /** The target-side key column for this hop; auto-resolved if omitted. */
  targetKey?: keyof T;
  /** Extra filter condition(s) applied at this hop. */
  where?: object | object[];
};

/** The property decorator returned by `@Link(...)`, additionally chainable via `.toOne(...)`/`.toMany(...)` to describe multi-hop relations. */
type LinkPropertyDecorator = PropertyDecorator & {
  /** Adds a to-one hop to the chain (or sets the initial target, for the first call). */
  toOne<T>(type: TypeThunk<T>, args?: LinkArgs<T>): LinkPropertyDecorator;

  /** Adds a to-many hop to the chain (or sets the initial target, for the first call). */
  toMany<T>(type: TypeThunk<T>, args?: LinkArgs<T>): LinkPropertyDecorator;
};

/**
 * Declares an association field: a relation to another `@Entity`-decorated
 * class, resolved via a `JOIN` (to-one) or a correlated
 * sub-query/eager-fetch (to-many) when the field is included in a query's
 * projection. The relation target and shape is set via a chained
 * `.toOne(Type)`/`.toMany(Type)` call (defaulting to `.toOne(<property's
 * own TS type>)` when neither is called and the property isn't an array),
 * and can be extended into a multi-hop relation by chaining further
 * `.toOne(...)`/`.toMany(...)` calls.
 *
 * @throws {TypeError} If applied to a symbol-keyed property, if the target type can't be determined without an explicit `.toOne(...)`/`.toMany(...)` call, or if the property's array-ness doesn't match the relation's to-one/to-many-ness.
 */
export function Link(options?: AssociationFieldOptions): LinkPropertyDecorator {
  let root: LinkChain<any>;
  let chain: LinkChain<any>;

  const fn: LinkPropertyDecorator = (
    target: Object,
    propertyKey: string | symbol,
  ): void => {
    if (typeof propertyKey !== 'string')
      throw new TypeError('Symbol properties are not allowed');
    const reflectType = Reflect.getMetadata('design:type', target, propertyKey);
    if (!root) {
      if (reflectType === Array) {
        throw new TypeError(
          `Can't get type information while it is an array. Please define entity type`,
        );
      }
      if (!EntityMetadata.get(reflectType))
        throw new TypeError(
          `No entity metadata found for type "${reflectType}"`,
        );
      fn.toOne(reflectType);
    }
    if (reflectType !== Array && root.first.returnsMany()) {
      throw new TypeError(
        `Link returns single instance however property type is an array`,
      );
    }
    if (reflectType === Array && !root.first.returnsMany()) {
      throw new TypeError(
        `Link returns array of instances however property type is not an array`,
      );
    }
    const entity = EntityMetadata.define(target.constructor as Type);
    // @ts-ignore
    // noinspection JSConstantReassignment
    root.first.source = entity.ctor;
    EntityMetadata.defineAssociationField(
      entity,
      propertyKey,
      root.first,
      options,
    );
  };

  fn.toOne = <T>(type: TypeThunk<T>, args?: LinkArgs<T>) => {
    if (chain) {
      chain = chain.linkToOne(type, args?.targetKey, args?.sourceKey);
      if (args?.where) chain.where(args.where);
      return fn;
    }
    root = linkToOne(type, args?.targetKey, args?.sourceKey);
    chain = root;
    if (args?.where) chain.where(args.where);
    return fn;
  };

  fn.toMany = <T>(type: TypeThunk<T>, args?: LinkArgs<T>) => {
    if (chain) {
      chain = chain.linkToMany(type, args?.targetKey, args?.sourceKey);
      if (args?.where) chain.where(args.where);
      return fn;
    }
    root = linkToMany(type, args?.targetKey, args?.sourceKey);
    chain = root;
    if (args?.where) chain.where(args.where);
    return fn;
  };
  return fn;
}

/** Creates a to-one {@link LinkChain}. */
function linkToOne<T>(
  type: TypeThunk<T>,
  targetKey?: keyof T,
  sourceKey?: string,
): LinkChain<T> {
  return new LinkChain<T>(type, targetKey, sourceKey);
}

/** Creates a to-many {@link LinkChain}. */
function linkToMany<T>(
  type: TypeThunk<T>,
  targetKey?: keyof T,
  sourceKey?: string,
): LinkChain<T> {
  return new LinkChain<T>(type, targetKey, sourceKey, true);
}
