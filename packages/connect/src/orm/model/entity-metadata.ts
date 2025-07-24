import { DataType } from '@sqb/builder';
import { Maybe, Type } from 'ts-gems';
import { ENTITY_METADATA_KEY } from '../orm.const.js';
import { Ctor, TypeThunk } from '../orm.type.js';
import {
  isAssociationField,
  isColumnField,
  isEmbeddedField,
} from '../util/orm.helper.js';
import { Association } from './association.js';
import {
  AssociationFieldMetadata,
  AssociationFieldOptions,
} from './association-field-metadata.js';
import { AssociationNode } from './association-node.js';
import {
  ColumnFieldMetadata,
  ColumnFieldOptions,
} from './column-field-metadata.js';
import {
  EmbeddedFieldMetadata,
  EmbeddedFieldOptions,
} from './embedded-field-metadata.js';
import { IndexMetadata } from './index-metadata.js';

export type AnyFieldMetadata =
  | ColumnFieldMetadata
  | EmbeddedFieldMetadata
  | AssociationFieldMetadata;
export type EntityOptions = Partial<
  Pick<EntityMetadata, 'name' | 'schema' | 'comment' | 'tableName'>
>;

export interface EntityMetadata {
  readonly ctor: Type;
  readonly name: string;
  tableName?: string;
  schema?: string;
  comment?: string;
  fields: Record<string, AnyFieldMetadata>;
  indexes: IndexMetadata[];
  foreignKeys: Association[];
  eventListeners: Record<string, Function[]>;
}

export namespace EntityMetadata {
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

  export function get(ctor: Ctor): Maybe<EntityMetadata> {
    return Reflect.getMetadata(ENTITY_METADATA_KEY, ctor);
  }

  export function getOwn(ctor: Ctor): Maybe<EntityMetadata> {
    return Reflect.getOwnMetadata(ENTITY_METADATA_KEY, ctor);
  }

  export function getField(
    entity: EntityMetadata,
    fieldName: string,
  ): Maybe<AnyFieldMetadata> {
    return fieldName ? entity.fields[fieldName.toLowerCase()] : undefined;
  }

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

  export function findField(
    entity: EntityMetadata,
    predicate: (el: AnyFieldMetadata) => boolean,
  ): Maybe<AnyFieldMetadata> {
    return Object.values(entity.fields).find(predicate);
  }

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

  export function getColumnFieldNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, isColumnField);
  }

  export function getEmbeddedFieldNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, isEmbeddedField);
  }

  export function getAssociationFieldNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, isAssociationField);
  }

  export function getNonAssociationFieldNames(
    entity: EntityMetadata,
  ): string[] {
    return getFieldNames(entity, x => !isAssociationField(x));
  }

  export function getInsertColumnNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, x => isColumnField(x) && !x.noInsert);
  }

  export function getUpdateColumnNames(entity: EntityMetadata): string[] {
    return getFieldNames(entity, x => isColumnField(x) && !x.noUpdate);
  }

  export function getPrimaryIndex(
    entity: EntityMetadata,
  ): Maybe<IndexMetadata> {
    return entity.indexes && entity.indexes.find(idx => idx.primary);
  }

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

  export async function getForeignKeyFor(
    src: EntityMetadata,
    trg: EntityMetadata,
  ): Promise<Maybe<Association>> {
    if (!src.foreignKeys) return;
    for (const f of src.foreignKeys) {
      if ((await f.resolveTarget()) === trg) return f;
    }
  }

  export function addIndex(entity: EntityMetadata, index: IndexMetadata): void {
    entity.indexes = entity.indexes || [];
    index = {
      ...index,
      columns: Array.isArray(index.columns) ? index.columns : [index.columns],
    };
    if (index.primary) entity.indexes.forEach(idx => delete idx.primary);
    entity.indexes.push(index);
  }

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

    prop = ColumnFieldMetadata.create(entity, name, options);
    entity.fields[name.toLowerCase()] = prop;
    return prop;
  }

  export function defineEmbeddedField(
    entity: EntityMetadata,
    name: string,
    type: TypeThunk,
    options?: EmbeddedFieldOptions,
  ): EmbeddedFieldMetadata {
    delete (entity as any)._fieldNames;
    let prop = EntityMetadata.getField(entity, name);
    if (isEmbeddedField(prop)) options = { ...prop, ...options };
    prop = EmbeddedFieldMetadata.create(entity, name, type, options);
    entity.fields[name.toLowerCase()] = prop;
    return prop;
  }

  export function defineAssociationField(
    entity: EntityMetadata,
    propertyKey: string,
    association: AssociationNode,
    options?: AssociationFieldOptions,
  ): AssociationFieldMetadata {
    delete (entity as any)._fieldNames;
    const prop = AssociationFieldMetadata.create(
      entity,
      propertyKey,
      association,
      options,
    );
    let l: AssociationNode | undefined = association;
    let i = 1;
    while (l) {
      l.name = entity.name + '.' + propertyKey + '#' + i++;
      l = l.next;
    }
    entity.fields[propertyKey.toLowerCase()] = prop;
    return prop;
  }

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
