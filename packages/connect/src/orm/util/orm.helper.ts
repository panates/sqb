import { Type } from 'ts-gems';
import { AssociationFieldMetadata } from '../model/association-field-metadata.js';
import type { ColumnFieldMetadata } from '../model/column-field-metadata.js';
import { EmbeddedFieldMetadata } from '../model/embedded-field-metadata.js';
import type { EntityMetadata } from '../model/entity-metadata.js';
import { ENTITY_METADATA_KEY } from '../orm.const.js';
import type { TypeResolver, TypeThunk } from '../orm.type.js';

export function isClass(fn: any): fn is Type {
  return typeof fn === 'function' && /^\s*class/.test(fn.toString());
}

export function isEntityClass(fn: any): fn is Type {
  return isClass(fn) && Reflect.hasMetadata(ENTITY_METADATA_KEY, fn);
}

export function isColumnField(f: any): f is ColumnFieldMetadata {
  return !!(f && f.name && f.kind === 'column');
}

export const isEmbeddedField = (f: any): f is EmbeddedFieldMetadata =>
  !!(f && f.name && f.kind === 'object');

export const isAssociationField = (f: any): f is AssociationFieldMetadata =>
  !!(f && f.name && f.kind === 'association');

export async function resolveEntity(
  ctorThunk: TypeThunk,
): Promise<Type | undefined> {
  if (typeof ctorThunk !== 'function') return;
  if (!isClass(ctorThunk)) ctorThunk = await (ctorThunk as TypeResolver<any>)();
  if (isEntityClass(ctorThunk)) return ctorThunk as Type;
}

export async function resolveEntityMeta(
  ctorThunk: TypeThunk,
): Promise<EntityMetadata | undefined> {
  const ctor = await resolveEntity(ctorThunk);
  return ctor && Reflect.getMetadata(ENTITY_METADATA_KEY, ctor);
}
