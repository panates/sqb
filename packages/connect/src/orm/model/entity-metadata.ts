import { DataType } from '@sqb/builder';
import type { Maybe, Type } from 'ts-gems';
import { ENTITY_METADATA_KEY } from '../orm.const.js';
import type { Ctor, TypeThunk } from '../orm.type.js';
import {
  isAssociationField,
  isColumnField,
  isEmbeddedField,
} from '../util/orm.helper.js';
import { Association } from './association.js';
import type {
  AssociationFieldMetadata,
  AssociationFieldOptions,
} from './association-field-metadata.js';
import { AssociationNode } from './association-node.js';
import type {
  ColumnFieldMetadata,
  ColumnFieldOptions,
} from './column-field-metadata.js';
import type {
  EmbeddedFieldMetadata,
  EmbeddedFieldOptions,
} from './embedded-field-metadata.js';
import type { IndexMetadata } from './index-metadata.js';

/** Any of the three field-metadata kinds an entity's fields can be. */
export type AnyFieldMetadata =
  ColumnFieldMetadata | EmbeddedFieldMetadata | AssociationFieldMetadata;
/** Options accepted by the `@Entity(...)` decorator. */
export type EntityOptions = Partial<
  Pick<EntityMetadata, 'name' | 'schema' | 'comment' | 'tableName'>
>;

/**
 * The full metadata SQB tracks for one `@Entity`-decorated class: its table
 * mapping, fields (columns/embeds/associations), indexes, foreign keys, and
 * lifecycle event listeners. Stored via `Reflect.defineMetadata` under
 * {@link ENTITY_METADATA_KEY} on the class itself - obtained with
 * `EntityMetadata.get(ctor)`, never constructed directly.
 */
export interface EntityMetadata {
  /** The decorated entity class. */
  readonly ctor: Type;
  /** The entity's name (defaults to the class name). */
  readonly name: string;
  /** The mapped table name. */
  tableName?: string;
  /** The mapped schema name, if any. */
  schema?: string;
  comment?: string;
  /** This entity's own fields, keyed by lower-cased field name. */
  fields: Record<string, AnyFieldMetadata>;
  /** Indexes declared on this entity, including its primary key (marked with `primary: true`). */
  indexes: IndexMetadata[];
  /** Foreign-key associations declared via `@ForeignKey`. */
  foreignKeys: Association[];
  /** Lifecycle callbacks registered via `@BeforeInsert`/`@AfterInsert`/etc., keyed by event name. */
  eventListeners: Record<string, Function[]>;
}

/**
 * Namespace of static operations on {@link EntityMetadata} - the decorators
 * (`@Entity`, `@Column`, `@Link`, ...) are all thin wrappers around these
 * functions, and `Entity.getMetadata`/`Entity.getField`/etc. re-export a
 * subset of them for direct use without importing `EntityMetadata` itself.
 */
export namespace EntityMetadata {
  /**
   * Gets or creates the metadata for `ctor`, inheriting fields/indexes/
   * foreign keys/event listeners from its base class's own metadata (if
   * any) the first time it's created for this class.
   */
  export function define(ctor: Ctor): EntityMetadata {
    const own = getOwn(ctor);
    if (own) return own;
    const baseMeta = get(ctor);
    const meta: EntityMetadata = {
      ctor: ctor as Type,
      name: ctor.name,
      fields: {},
      indexes: [],
      foreignKeys: [],
      eventListeners: {},
    };
    Reflect.defineMetadata(ENTITY_METADATA_KEY, meta, ctor);
    // Merge base entity columns into this one
    if (baseMeta) {
      EntityMetadata.mixin(meta, baseMeta);
    }

    return meta;
  }

  /** Gets `ctor`'s metadata, inherited from a base class if `ctor` itself has none of its own. */
  export function get(ctor: Ctor): Maybe<EntityMetadata> {
    return Reflect.getMetadata(ENTITY_METADATA_KEY, ctor);
  }

  /** Gets `ctor`'s own metadata, ignoring any inherited from a base class. */
  export function getOwn(ctor: Ctor): Maybe<EntityMetadata> {
    return Reflect.getOwnMetadata(ENTITY_METADATA_KEY, ctor);
  }

  /** Looks up a field by its property name (case-insensitive), regardless of kind. */
  export function getField(
    entity: EntityMetadata,
    fieldName: string,
  ): Maybe<AnyFieldMetadata> {
    return fieldName ? entity.fields[fieldName.toLowerCase()] : undefined;
  }

  /**
   * Looks up a field by name, requiring it to be a column.
   *
   * @throws {Error} If the field exists but isn't a column.
   */
  export function getColumnField(
    entity: EntityMetadata,
    fieldName: string,
  ): Maybe<ColumnFieldMetadata> {
    const el = getField(entity, fieldName);
    if (el && !isColumnField(el))
      throw new Error(
        `"${el.name}" requested as "column" but it is "${el.kind}"`,
      );
    return el as ColumnFieldMetadata;
  }

  /**
   * Looks up a field by name, requiring it to be an embedded field.
   *
   * @throws {Error} If the field exists but isn't an embedded field.
   */
  export function getEmbeddedField(
    entity: EntityMetadata,
    fieldName: string,
  ): Maybe<EmbeddedFieldMetadata> {
    const el = getField(entity, fieldName);
    if (el && !isEmbeddedField(el))
      throw new Error(
        `"${el.name}" requested as "embedded" but it is "${el.kind}"`,
      );
    return el as EmbeddedFieldMetadata;
  }

  /**
   * Looks up a field by name, requiring it to be an association.
   *
   * @throws {Error} If the field exists but isn't an association.
   */
  export function getAssociationField(
    entity: EntityMetadata,
    fieldName: string,
  ): Maybe<AssociationFieldMetadata> {
    const el = getField(entity, fieldName);
    if (el && !isAssociationField(el)) {
      throw new Error(
        `"${el.name}" requested as "association" but it is "${el.kind}"`,
      );
    }
    return el as AssociationFieldMetadata;
  }

  /** Finds the first field matching `predicate`. */
  export function findField(
    entity: EntityMetadata,
    predicate: (el: AnyFieldMetadata) => boolean,
  ): Maybe<AnyFieldMetadata> {
    return Object.values(entity.fields).find(predicate);
  }

  /** Looks up a column field by its mapped table column name (case-insensitive) rather than its entity property name. */
  export function getColumnFieldByFieldName(
    entity: EntityMetadata,
    fieldName: string,
  ): Maybe<ColumnFieldMetadata> {
    if (!fieldName) return;
    fieldName = fieldName.toLowerCase();
    for (const prop of Object.values(entity.fields)) {
      if (isColumnField(prop) && prop.fieldName.toLowerCase() === fieldName)
        return prop;
    }
  }

  /**
   * Returns the entity's field names, optionally narrowed by `filter`. With
   * no filter, the result is cached on the entity (invalidated whenever a
   * field is added).
   */
  export function getFieldNames(
    entity: EntityMetadata,
    filter?: (el: AnyFieldMetadata) => boolean,
  ): string[] {
    if (filter) {
      const out: string[] = [];
      for (const el of Object.values(entity.fields)) {
        if (el && (!filter || filter(el))) out.push(el.name);
      }
      return out;
    }
    // Create a cached name array
    if (!Object.prototype.hasOwnProperty.call(entity, '_fieldNames')) {
      Object.defineProperty(entity, '_fieldNames', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: Object.values(entity.fields).map(m => m.name),
      });
    }
    return (entity as any)._fieldNames as string[];
  }

  /** Names of every column field. */
  export function getColumnFieldNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, isColumnField);
  }

  /** Names of every embedded field. */
  export function getEmbeddedFieldNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, isEmbeddedField);
  }

  /** Names of every association field. */
  export function getAssociationFieldNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, isAssociationField);
  }

  /** Names of every field that isn't an association. */
  export function getNonAssociationFieldNames(
    entity: EntityMetadata,
  ): string[] {
    return getFieldNames(entity, x => !isAssociationField(x));
  }

  /** Names of every column field usable in an `INSERT` (excludes those marked `noInsert`). */
  export function getInsertColumnNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, x => isColumnField(x) && !x.noInsert);
  }

  /** Names of every column field usable in an `UPDATE` (excludes those marked `noUpdate`). */
  export function getUpdateColumnNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, x => isColumnField(x) && !x.noUpdate);
  }

  /** Returns the entity's primary-key index, or `undefined` if none is declared. */
  export function getPrimaryIndex(
    entity: EntityMetadata,
  ): Maybe<IndexMetadata> {
    return entity.indexes && entity.indexes.find(idx => idx.primary);
  }

  /**
   * Returns the column-field metadata for each column in the entity's
   * primary-key index, in index order.
   *
   * @throws {Error} If a primary-key column name doesn't correspond to a real column field.
   */
  export function getPrimaryIndexColumns(
    entity: EntityMetadata,
  ): ColumnFieldMetadata[] {
    const idx = getPrimaryIndex(entity);
    const out: ColumnFieldMetadata[] = [];
    if (idx) {
      for (const k of idx.columns) {
        const col = getColumnField(entity, k);
        if (!col)
          throw new Error(
            `Data column "${k}" in primary index of ${entity.name} does not exists`,
          );
        out.push(col);
      }
    }
    return out;
  }

  /** Finds the foreign key declared on `src` that points at `trg`, if any. */
  export async function getForeignKeyFor(
    src: EntityMetadata,
    trg: EntityMetadata,
  ): Promise<Maybe<Association>> {
    if (!src.foreignKeys) return;
    for (const f of src.foreignKeys) {
      if ((await f.resolveTarget()) === trg) return f;
    }
  }

  /**
   * Adds an index to the entity, normalizing `columns` to an array. Setting
   * `index.primary` clears `primary` off any existing index (an entity has
   * at most one primary key).
   */
  export function addIndex(entity: EntityMetadata, index: IndexMetadata): void {
    entity.indexes = entity.indexes || [];
    index = {
      ...index,
      columns: Array.isArray(index.columns) ? index.columns : [index.columns],
    };
    if (index.primary) entity.indexes.forEach(idx => delete idx.primary);
    entity.indexes.push(index);
  }

  /** Registers a foreign key from `entity.propertyKey` to `target`, as declared via `@ForeignKey`. */
  export function addForeignKey(
    entity: EntityMetadata,
    propertyKey: string,
    target: TypeThunk,
    targetKey?: string,
  ): void {
    entity.foreignKeys = entity.foreignKeys || [];
    const fk = new Association(entity.name + '.' + propertyKey, {
      source: entity.ctor,
      sourceKey: propertyKey,
      target,
      targetKey,
    });
    entity.foreignKeys.push(fk);
  }

  /**
   * Registers a lifecycle callback (e.g. `'before-insert'`), as declared
   * via `@BeforeInsert`/`@AfterInsert`/etc.
   *
   * @throws {Error} If `fn` isn't a function.
   */
  export function addEventListener(
    entity: EntityMetadata,
    event: string,
    fn: Function,
  ): void {
    if (typeof fn !== 'function')
      throw new Error('Property must be a function');
    entity.eventListeners = entity.eventListeners || {};
    entity.eventListeners[event] = entity.eventListeners[event] || [];
    entity.eventListeners[event].push(fn);
  }

  /**
   * Defines (or merges options into an existing) column field, as declared
   * via `@Column`. Infers `type`/`dataType` from each other (or from
   * `Reflect`-emitted design-time type metadata) when not given explicitly.
   */
  export function defineColumnField(
    entity: EntityMetadata,
    name: string,
    options: ColumnFieldOptions = {},
  ): ColumnFieldMetadata {
    delete (entity as any)._fieldNames;
    let prop = EntityMetadata.getField(entity, name);
    if (isColumnField(prop)) options = { ...prop, ...options };

    if (!options.type) {
      switch (options.dataType) {
        case DataType.BOOL:
          options.type = Boolean;
          break;
        case DataType.VARCHAR:
        case DataType.CHAR:
        case DataType.TEXT:
          options.type = String;
          break;
        case DataType.NUMBER:
        case DataType.DOUBLE:
        case DataType.FLOAT:
        case DataType.INTEGER:
        case DataType.SMALLINT:
          options.type = Number;
          break;
        case DataType.TIMESTAMP:
        case DataType.TIMESTAMPTZ:
          options.type = Date;
          break;
        case DataType.BINARY:
          options.type = Buffer;
          break;
        default:
          options.type = String;
      }
    }
    if (!options.dataType) {
      switch (options.type) {
        case Boolean:
          options.dataType = DataType.BOOL;
          break;
        case Number:
          options.dataType = DataType.NUMBER;
          break;
        case Date:
          options.dataType = DataType.TIMESTAMP;
          break;
        case Array:
          options.dataType = DataType.VARCHAR;
          options.isArray = true;
          break;
        case Buffer:
          options.dataType = DataType.BINARY;
          break;
        default:
          options.dataType = DataType.VARCHAR;
      }
    }

    prop = {
      fieldName: name,
      ...options,
      kind: 'column',
      entity,
      name,
    } satisfies ColumnFieldMetadata;
    entity.fields[name.toLowerCase()] = prop;
    return prop;
  }

  /** Defines (or merges options into an existing) embedded field, as declared via `@Embedded`. */
  export function defineEmbeddedField(
    entity: EntityMetadata,
    name: string,
    type: TypeThunk,
    options?: EmbeddedFieldOptions,
  ): EmbeddedFieldMetadata {
    delete (entity as any)._fieldNames;
    let prop = EntityMetadata.getField(entity, name);
    if (isEmbeddedField(prop)) options = { ...prop, ...options };
    prop = {
      ...options,
      kind: 'object',
      entity,
      name,
      type,
    } satisfies EmbeddedFieldMetadata;
    entity.fields[name.toLowerCase()] = prop;
    return prop;
  }

  /**
   * Defines an association field, as declared via `@Link`. Assigns each
   * hop in `association`'s chain a unique name
   * (`<entity>.<propertyKey>#<hop>`).
   */
  export function defineAssociationField(
    entity: EntityMetadata,
    propertyKey: string,
    association: AssociationNode,
    options?: AssociationFieldOptions,
  ): AssociationFieldMetadata {
    delete (entity as any)._fieldNames;
    const prop = {
      ...options,
      kind: 'association',
      entity,
      name: propertyKey,
      association,
    } satisfies AssociationFieldMetadata;
    let l: AssociationNode | undefined = association;
    let i = 1;
    while (l) {
      l.name = entity.name + '.' + propertyKey + '#' + i++;
      l = l.next;
    }
    entity.fields[propertyKey.toLowerCase()] = prop;
    return prop;
  }

  /** Declares the entity's primary key, as declared via `@PrimaryKey`. Equivalent to `addIndex(entity, { ...options, columns, unique: true, primary: true })`. */
  export function setPrimaryKeys(
    entity: EntityMetadata,
    column: string | string[],
    options?: Omit<IndexMetadata, 'columns' | 'unique' | 'primary'>,
  ): void {
    addIndex(entity, {
      ...options,
      columns: Array.isArray(column) ? column : [column],
      unique: true,
      primary: true,
    });
  }

  /**
   * Copies `base`'s table mapping (if `derived` doesn't already have one),
   * indexes, foreign keys, event listeners, and fields onto `derived` -
   * used both for class inheritance (`EntityMetadata.define` mixes in a
   * base class's metadata automatically) and for `Entity.mixin`/`Entity.Pick`/
   * `Entity.Omit`/`Entity.Union`.
   *
   * @param filter - When given, restricts which of `base`'s fields (by name) and index/foreign-key columns are copied.
   */
  export function mixin(
    derived: EntityMetadata,
    base: EntityMetadata,
    filter?: (n: string) => boolean,
  ) {
    const hasField = (k: string) => !filter || filter(k);

    delete (derived as any)._fieldNames;
    if (!derived.tableName) {
      derived.tableName = base.tableName;
      derived.schema = base.schema;
      derived.comment = base.comment;
    }
    // Copy indexes
    if (base.indexes && base.indexes.length) {
      const hasPrimaryIndex = !!getPrimaryIndex(derived);
      for (const idx of base.indexes) {
        if (!idx.columns.find(x => !hasField(x))) {
          if (hasPrimaryIndex)
            addIndex(derived, { ...idx, primary: undefined });
          else addIndex(derived, idx);
        }
      }
    }

    // Copy foreign indexes
    if (base.foreignKeys && base.foreignKeys.length) {
      derived.foreignKeys = derived.foreignKeys || [];
      for (const fk of base.foreignKeys) {
        if (!fk.sourceKey || hasField(fk.sourceKey)) {
          const newFk = new Association(fk.name, {
            ...fk,
            source: derived.ctor,
          });
          derived.foreignKeys.push(newFk);
        }
      }
    }

    // Copy event listeners
    if (base.eventListeners) {
      for (const [event, arr] of Object.entries(base.eventListeners)) {
        arr.forEach(fn => EntityMetadata.addEventListener(derived, event, fn));
      }
    }

    // Copy fields
    derived.fields = derived.fields || {};
    for (const [n, p] of Object.entries(base.fields)) {
      if (!hasField(n)) continue;
      const o: any = Object.assign({}, p);
      o.entity = derived;
      Object.setPrototypeOf(o, Object.getPrototypeOf(p));
      derived.fields[n] = o;
    }
  }
}
