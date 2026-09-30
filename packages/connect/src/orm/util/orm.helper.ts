import type { Type } from 'ts-gems';
import type { AssociationFieldMetadata } from '../model/association-field-metadata.js';
import type { ColumnFieldMetadata } from '../model/column-field-metadata.js';
import type { EmbeddedFieldMetadata } from '../model/embedded-field-metadata.js';
import type { EntityMetadata } from '../model/entity-metadata.js';
import { ENTITY_METADATA_KEY } from '../orm.const.js';
import type { FieldValue, TypeResolver, TypeThunk } from '../orm.type.js';

/** Checks whether `fn` is an ES class (a function whose source starts with the `class` keyword), as opposed to a plain function or a `TypeResolver` thunk. */
export function isClass(fn: any): fn is Type {
  return typeof fn === 'function' && /^\s*class/.test(fn.toString());
}

/** Type guard for an `@Entity`-decorated class. */
export function isEntityClass(fn: any): fn is Type {
  return isClass(fn) && Reflect.hasMetadata(ENTITY_METADATA_KEY, fn);
}

/** Type guard for a {@link ColumnFieldMetadata}. */
export function isColumnField(f: any): f is ColumnFieldMetadata {
  return !!(f && f.name && f.kind === 'column');
}

/** Type guard for an {@link EmbeddedFieldMetadata}. */
export const isEmbeddedField = (f: any): f is EmbeddedFieldMetadata =>
  !!(f && f.name && f.kind === 'object');

/** Type guard for an {@link AssociationFieldMetadata}. */
export const isAssociationField = (f: any): f is AssociationFieldMetadata =>
  !!(f && f.name && f.kind === 'association');

/**
 * Resolves a {@link TypeThunk} to its entity class, calling it first if it's
 * a {@link TypeResolver} function rather than a class already.
 *
 * @returns The resolved class, or `undefined` if `ctorThunk` isn't a function, or doesn't resolve to an `@Entity`-decorated class.
 */
export async function resolveEntity(
  ctorThunk: TypeThunk,
): Promise<Type | undefined> {
  if (typeof ctorThunk !== 'function') return;
  if (!isClass(ctorThunk)) ctorThunk = await (ctorThunk as TypeResolver<any>)();
  if (isEntityClass(ctorThunk)) return ctorThunk as Type;
}

/** Resolves a {@link TypeThunk} (via {@link resolveEntity}) to its {@link EntityMetadata}. */
export async function resolveEntityMeta(
  ctorThunk: TypeThunk,
): Promise<EntityMetadata | undefined> {
  const ctor = await resolveEntity(ctorThunk);
  return ctor && Reflect.getMetadata(ENTITY_METADATA_KEY, ctor);
}

/**
 * Resolves an embedded field's declared type to its {@link EntityMetadata}.
 *
 * @throws {Error} If `meta.type` doesn't resolve to an `@Entity`-decorated class.
 */
export async function resolveEntityForEmbeddedField(
  meta: EmbeddedFieldMetadata,
): Promise<EntityMetadata> {
  const typ = await resolveEntityMeta(meta.type);
  if (typ) {
    return typ;
  }
  throw new Error(`Can't resolve type of ${meta.entity.name}.${meta.name}`);
}

/**
 * Validates that `v` is one of a column's declared `enum` values.
 * No-op if `v` is `undefined`, the column has no `enum`, or `v` is `null`
 * on a nullable column.
 *
 * @throws {Error} If `v` isn't one of the column's allowed enum values.
 */
export function checkEnumValue(col: ColumnFieldMetadata, v: FieldValue) {
  if (v === undefined || !col.enum || (v == null && !col.notNull)) return;
  const enumValues = Array.isArray(col.enum)
    ? col.enum
    : Object.values(col.enum);
  if (!enumValues.includes(v))
    throw new Error(
      `${col.entity.name}.${col.name} value must be one of (${enumValues})`,
    );
}
