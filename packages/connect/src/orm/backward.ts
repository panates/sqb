// Backward compatibility
import { MutableKeys, Type } from 'ts-gems';
import { Entity } from './decorators/entity.decorator.js';

export function getInsertColumnNames<T, K extends MutableKeys<T>>(
  ctor: Type<T>,
): K[] {
  return Entity.getInsertColumnNames(ctor) as K[];
}

export function getUpdateColumnNames<T, K extends MutableKeys<T>>(
  ctor: Type<T>,
): K[] {
  return Entity.getUpdateColumnNames(ctor) as K[];
}

export function getNonAssociationElementNames<T, K extends MutableKeys<T>>(
  ctor: Type<T>,
): K[] {
  return Entity.getNonAssociationFieldNames(ctor) as K[];
}

export function mixinEntities<A, B>(
  derivedCtor: Type<A>,
  baseB: Type<B>,
): Type<A & B>;
export function mixinEntities<A, B, C>(
  derivedCtor: Type<A>,
  baseB: Type<B>,
  baseC: Type<C>,
): Type<A & B & C>;
export function mixinEntities<A, B, C, D>(
  derivedCtor: Type<A>,
  baseB: Type<B>,
  baseC: Type<C>,
  baseD: Type<D>,
): Type<A & B & C & D>;
export function mixinEntities<A, B, C, D, E>(
  derivedCtor: Type<A>,
  baseB: Type<B>,
  baseC: Type<C>,
  baseD: Type<D>,
  baseE: Type<E>,
): Type<A & B & C & D & E>;
export function mixinEntities<A, B, C, D, E, F>(
  derivedCtor: Type<A>,
  baseB: Type<B>,
  baseC: Type<C>,
  baseD: Type<D>,
  baseE: Type<E>,
  baseF: Type<F>,
): Type<A & B & C & D & E & F>;
export function mixinEntities(derivedCtor: any, ...bases: Type[]) {
  // @ts-ignore
  return Entity.mixin(derivedCtor, ...bases);
}

export const OmitEntity = Entity.Omit;
export const PickEntity = Entity.Pick;
export const UnionEntity = Entity.Union;
