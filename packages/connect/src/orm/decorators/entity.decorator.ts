import type { Maybe, Type } from 'ts-gems';
import type { AssociationFieldMetadata } from '../model/association-field-metadata.js';
import type { ColumnFieldMetadata } from '../model/column-field-metadata.js';
import { EmbeddedFieldMetadata } from '../model/embedded-field-metadata.js';
import {
  type AnyFieldMetadata,
  EntityMetadata,
  type EntityOptions,
} from '../model/entity-metadata.js';
import type { IndexMetadata } from '../model/index-metadata.js';
import { applyMixins } from '../util/apply-mixins.js';

/**
 * Marks a class as a database entity, mapping it to a table.
 *
 * @param options - A table name string, or an options object (`tableName`, `schema`, `comment`). Defaults `tableName` to the class name.
 */
export function Entity(options?: EntityOptions | string): ClassDecorator {
  return function (target) {
    const opts: EntityOptions = typeof options === 'object' ? options : {};
    const tableName = typeof options === 'string' ? options : opts.tableName;
    const entity = EntityMetadata.define(target);
    entity.tableName = tableName || target.name;
    if (opts.schema) entity.schema = opts.schema;
    if (opts.comment) entity.comment = opts.comment;
  };
}

/**
 * Convenience read-only accessors for an `@Entity`-decorated class's
 * {@link EntityMetadata}, so callers can query field/index metadata without
 * importing `EntityMetadata` (or handling the "not decorated yet" case)
 * themselves. Each function returns an empty/`undefined` result rather than
 * throwing when `ctor` isn't `@Entity`-decorated.
 */
export namespace Entity {
  /** @see {@link EntityMetadata.get} */
  export const getMetadata = EntityMetadata.get;
  /** @see {@link EntityMetadata.getOwn} */
  export const getOwnMetadata = EntityMetadata.getOwn;

  /** @see {@link EntityMetadata.getField} */
  export function getField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<AnyFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getField(model, key as string);
  }

  /** @see {@link EntityMetadata.getColumnField} */
  export function getColumnField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<ColumnFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getColumnField(model, key as string);
  }

  /** @see {@link EntityMetadata.getEmbeddedField} */
  export function getEmbeddedField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<EmbeddedFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getEmbeddedField(model, key as string);
  }

  /** @see {@link EntityMetadata.getAssociationField} */
  export function getAssociationField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<AssociationFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getAssociationField(model, key as string);
  }

  /** @see {@link EntityMetadata.getColumnFieldByFieldName} */
  export function getColumnFieldByFieldName(
    ctor: Type,
    fieldName: string,
  ): Maybe<ColumnFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getColumnFieldByFieldName(model, fieldName);
  }

  /** @see {@link EntityMetadata.findField} */
  export function find(
    ctor: Type,
    predicate: (el: AnyFieldMetadata) => boolean,
  ): Maybe<AnyFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.findField(model, predicate);
  }

  /** @see {@link EntityMetadata.getFieldNames} */
  export function getFieldNames(
    ctor: Type,
    filter?: (el: AnyFieldMetadata) => boolean,
  ): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getFieldNames(model, filter)) || [];
  }

  /** @see {@link EntityMetadata.getColumnFieldNames} */
  export function getColumnFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getColumnFieldNames(model)) || [];
  }

  /** @see {@link EntityMetadata.getEmbeddedFieldNames} */
  export function getEmbeddedFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getEmbeddedFieldNames(model)) || [];
  }

  /** @see {@link EntityMetadata.getAssociationFieldNames} */
  export function getAssociationFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getAssociationFieldNames(model)) || [];
  }

  /** @see {@link EntityMetadata.getNonAssociationFieldNames} */
  export function getNonAssociationFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getNonAssociationFieldNames(model)) || [];
  }

  /** @see {@link EntityMetadata.getInsertColumnNames} */
  export function getInsertColumnNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getInsertColumnNames(model)) || [];
  }

  /** @see {@link EntityMetadata.getUpdateColumnNames} */
  export function getUpdateColumnNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getUpdateColumnNames(model)) || [];
  }

  /**
   * @see {@link EntityMetadata.getPrimaryIndex}
   * Unlike the other accessors here, this defines metadata for `ctor` if it doesn't have any yet (rather than returning `undefined`).
   */
  export function getPrimaryIndex(ctor: Type): Maybe<IndexMetadata> {
    const model = EntityMetadata.define(ctor);
    return EntityMetadata.getPrimaryIndex(model);
  }

  /**
   * @see {@link EntityMetadata.getPrimaryIndexColumns}
   * Unlike the other accessors here, this defines metadata for `ctor` if it doesn't have any yet (rather than returning an empty array).
   */
  export function getPrimaryIndexColumns(ctor: Type): ColumnFieldMetadata[] {
    const model = EntityMetadata.define(ctor);
    return EntityMetadata.getPrimaryIndexColumns(model);
  }

  /**
   * Merges one or more other entities' fields/indexes/foreign
   * keys/lifecycle listeners into `derivedCtor`'s own prototype and entity
   * metadata (via `applyMixins` + `EntityMetadata.mixin`) - useful when a
   * class can't simply `extends` its source entities (e.g. combining
   * multiple bases).
   */
  export function mixin<A, B>(
    derivedCtor: Type<A>,
    baseB: Type<B>,
  ): Type<A & B>;
  export function mixin<A, B, C>(
    derivedCtor: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
  ): Type<A & B & C>;
  export function mixin<A, B, C, D>(
    derivedCtor: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
    baseD: Type<D>,
  ): Type<A & B & C & D>;
  export function mixin<A, B, C, D, E>(
    derivedCtor: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
    baseD: Type<D>,
    baseE: Type<E>,
  ): Type<A & B & C & D & E>;
  export function mixin<A, B, C, D, E, F>(
    derivedCtor: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
    baseD: Type<D>,
    baseE: Type<E>,
    baseF: Type<F>,
  ): Type<A & B & C & D & E & F>;
  export function mixin(derivedCtor: any, ...bases: Type[]) {
    for (const base of bases) {
      if (!base) continue;
      applyMixins(derivedCtor, base);
      const srcMeta = EntityMetadata.get(base);
      if (srcMeta) {
        const trgMeta = EntityMetadata.define(derivedCtor);
        EntityMetadata.mixin(trgMeta, srcMeta);
      }
    }
    return derivedCtor;
  }

  /**
   * Creates a new entity class exposing only the given properties of
   * `classRef` (both at runtime and in its entity metadata) - the
   * `@Entity`-decorated equivalent of TypeScript's `Pick<T, K>`.
   */
  export function Pick<T, K extends keyof T>(
    classRef: Type<T>,
    keys: readonly K[],
  ): Type<Pick<T, (typeof keys)[number]>> {
    const PickEntityClass = class {
      constructor(...args: any[]) {
        applyConstructorProperties(this, classRef, args);
      }
    };
    const pickKeys = (keys as unknown as string[]).map(x => x.toLowerCase());
    const filter = k => pickKeys.includes(k.toLowerCase());
    applyMixins(PickEntityClass, classRef, filter);
    const srcMeta = EntityMetadata.get(classRef);
    if (srcMeta) {
      const trgMeta = EntityMetadata.define(PickEntityClass);
      EntityMetadata.mixin(trgMeta, srcMeta, filter);
    }
    return PickEntityClass as Type<Pick<T, (typeof keys)[number]>>;
  }

  /**
   * Creates a new entity class excluding the given properties of
   * `classRef` (both at runtime and in its entity metadata) - the
   * `@Entity`-decorated equivalent of TypeScript's `Omit<T, K>`.
   */
  export function Omit<T, K extends keyof T>(
    classRef: Type<T>,
    keys: readonly K[],
  ): Type<Omit<T, (typeof keys)[number]>> {
    const OmitEntityClass = class {
      constructor(...args: any[]) {
        applyConstructorProperties(this, classRef, args);
      }
    };
    const omitKeys = (keys as unknown as string[]).map(x => x.toLowerCase());
    const filter = k => !omitKeys.includes(k.toLowerCase());
    applyMixins(OmitEntityClass, classRef, filter);
    const srcMeta = EntityMetadata.get(classRef);
    if (srcMeta) {
      const trgMeta = EntityMetadata.define(OmitEntityClass);
      EntityMetadata.mixin(trgMeta, srcMeta, filter);
    }
    return OmitEntityClass as Type<Omit<T, (typeof keys)[number]>>;
  }

  export function Union<A, B>(baseA: Type<A>, baseB: Type<B>): Type<A & B>;
  export function Union<A, B, C>(
    baseA: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
  ): Type<A & B & C>;
  export function Union<A, B, C, D>(
    baseA: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
    baseD: Type<D>,
  ): Type<A & B & C & D>;
  export function Union<A, B, C, D, E>(
    baseA: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
    baseD: Type<D>,
    baseE: Type<E>,
  ): Type<A & B & C & D & E>;
  export function Union<A, B, C, D, E, F>(
    baseA: Type<A>,
    baseB: Type<B>,
    baseC: Type<C>,
    baseD: Type<D>,
    baseE: Type<E>,
    baseF: Type<F>,
  ): Type<A & B & C & D & E & F>;
  /**
   * Creates a new entity class combining the properties of all given
   * entities (both at runtime and in its entity metadata) - the
   * `@Entity`-decorated equivalent of TypeScript's `A & B & ...` union.
   */
  export function Union(...bases: Type[]) {
    const UnionClass = class {
      constructor(...args: any[]) {
        for (const c of bases) applyConstructorProperties(this, c, args);
      }
    };
    for (const base of bases) {
      applyMixins(UnionClass, base);
      const srcMeta = EntityMetadata.get(base);
      if (srcMeta) {
        const trgMeta = EntityMetadata.define(UnionClass);
        EntityMetadata.mixin(trgMeta, srcMeta);
      }
    }
    return UnionClass;
  }
}

/**
 * Copies own-properties set by `sourceClass`'s constructor (invoked with
 * `constructorArgs`, on a throwaway instance) onto `target`, used by
 * `Pick`/`Omit`/`Union`'s generated classes to replicate a source entity's
 * constructor-assigned instance properties without actually extending it.
 * Swallows any error from constructing `sourceClass` (e.g. if it requires
 * arguments incompatible with `constructorArgs`).
 */
function applyConstructorProperties(
  target: any,
  sourceClass: Type,
  constructorArgs: any[],
  isPropertyInherited?: (key: string) => boolean,
) {
  try {
    const tempInstance = new sourceClass(...constructorArgs);
    const keys = Object.getOwnPropertyNames(tempInstance);
    for (const key of keys) {
      const srcDesc = Object.getOwnPropertyDescriptor(tempInstance, key);
      const trgDesc = Object.getOwnPropertyDescriptor(target, key);
      if (
        !srcDesc ||
        trgDesc ||
        (isPropertyInherited && !isPropertyInherited(key))
      )
        continue;
      Object.defineProperty(target, key, srcDesc);
    }
  } catch {
    //
  }
}
