import type { Type } from 'ts-gems';

/** A class constructor, accepted more loosely than `ts-gems`' `Type` where a plain `Function` also has to be allowed (e.g. before entity metadata has narrowed it). */
export type Ctor = Type | Function;

/* Model related */
/** Discriminates an entity field's `AnyFieldMetadata` variant: a plain data column, an embedded sub-object, or an association to another entity. */
export type FieldKind = 'column' | 'object' | 'association';

/**
 * Indicates auto generation strategy
 */
export type ColumnAutoGenerationStrategy =
  'increment' | 'uuid' | 'rowid' | 'timestamp' | 'custom';

/** Transforms a column value on the way in (`parse`, reading from the database) or out (`serialize`, writing to the database) - see `@Parse`/`@Serialize`. */
export type ColumnTransformFunction = (value: any, name: string) => any;

/** A lazy entity-class resolver, used to break circular `import` cycles between entities that reference each other (e.g. via `@Link`). */
export type TypeResolver<T> = () => Type<T> | Promise<Type<T>>;
/** Either an entity class directly, or a {@link TypeResolver} for one - accepted wherever a decorator needs a target entity type (`@Link`, `@ForeignKey`, `@Embedded`). */
export type TypeThunk<T = any> = Type<T> | TypeResolver<T>;

/** The set of allowed values for an enum column: an array of literals, or a TS-style string enum object. */
export type EnumValue = FieldValue[] | Object;

/** A scalar value a column can hold. */
export type FieldValue = string | number | boolean | Date | null;
/** Computes a column's default value at insert time, given the values being inserted. */
export type DefaultValueGetter = (obj?: any) => FieldValue | undefined;

/** Constructor arguments for {@link Association} (and, by extension, `@ForeignKey`/`@Link`). */
export interface AssociationSettings {
  /** The entity the association is declared on. */
  source: TypeThunk;
  /** The entity the association points to. */
  target: TypeThunk;
  /** The source entity's key column; auto-resolved from a matching foreign key or primary key if omitted. */
  sourceKey?: string;
  /** The target entity's key column; auto-resolved from a matching foreign key or primary key if omitted. */
  targetKey?: string;
  /** Whether this association can resolve to more than one row (a to-many relation) rather than at most one (a to-one relation). */
  many?: boolean;
}
