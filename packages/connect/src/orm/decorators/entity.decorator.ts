import { Maybe, Type } from 'ts-gems';
import { AssociationFieldMetadata } from '../model/association-field-metadata.js';
import { ColumnFieldMetadata } from '../model/column-field-metadata.js';
import { EmbeddedFieldMetadata } from '../model/embedded-field-metadata.js';
import {
  AnyFieldMetadata,
  EntityMetadata,
  EntityOptions,
} from '../model/entity-metadata.js';
import { IndexMetadata } from '../model/index-metadata.js';
import { applyMixins } from '../util/apply-mixins.js';

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

export namespace Entity {
  export const getMetadata = EntityMetadata.get;
  export const getOwnMetadata = EntityMetadata.getOwn;

  export function getField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<AnyFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getField(model, key as string);
  }

  export function getColumnField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<ColumnFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getColumnField(model, key as string);
  }

  export function getEmbeddedField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<EmbeddedFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getEmbeddedField(model, key as string);
  }

  export function getAssociationField<T>(
    ctor: Type<T>,
    key: keyof T | string,
  ): Maybe<AssociationFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getAssociationField(model, key as string);
  }

  export function getColumnFieldByFieldName(
    ctor: Type,
    fieldName: string,
  ): Maybe<ColumnFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.getColumnFieldByFieldName(model, fieldName);
  }

  export function find(
    ctor: Type,
    predicate: (el: AnyFieldMetadata) => boolean,
  ): Maybe<AnyFieldMetadata> {
    const model = EntityMetadata.get(ctor);
    return model && EntityMetadata.findField(model, predicate);
  }

  export function getFieldNames(
    ctor: Type,
    filter?: (el: AnyFieldMetadata) => boolean,
  ): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getFieldNames(model, filter)) || [];
  }

  export function getColumnFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getColumnFieldNames(model)) || [];
  }

  export function getEmbeddedFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getEmbeddedFieldNames(model)) || [];
  }

  export function getAssociationFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getAssociationFieldNames(model)) || [];
  }

  export function getNonAssociationFieldNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getNonAssociationFieldNames(model)) || [];
  }

  export function getInsertColumnNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getInsertColumnNames(model)) || [];
  }

  export function getUpdateColumnNames(ctor: Type): string[] {
    const model = EntityMetadata.get(ctor);
    return (model && EntityMetadata.getUpdateColumnNames(model)) || [];
  }

  export function getPrimaryIndex(ctor: Type): Maybe<IndexMetadata> {
    const model = EntityMetadata.define(ctor);
    return EntityMetadata.getPrimaryIndex(model);
  }

  export function getPrimaryIndexColumns(ctor: Type): ColumnFieldMetadata[] {
    const model = EntityMetadata.define(ctor);
    return EntityMetadata.getPrimaryIndexColumns(model);
  }

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
