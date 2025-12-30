import { DataType } from '@sqb/builder';
import { Type } from 'ts-gems';
import type { FieldInfoMap } from '../../client/field-info-map.js';
import type { SqbConnection } from '../../client/sqb-connection.js';
import { ColumnTransformFunction } from '../orm.type.js';
import type { Repository } from '../repository.class.js';
import type { FindCommand } from './find.command.js';

export interface ValueProperty {
  fieldAlias: string;
  dataType?: DataType;
  parse?: ColumnTransformFunction;
}

export interface ObjectProperty {
  converter: RowConverter;
  type: Type;
}

export interface NestedProperty {
  converter: RowConverter;
  type: Type;
  parentField: string;
  keyField: string;
  findCommand: FindCommand;
  sort?: string[];
  paramValues: any[];
}

const isValueProperty = (prop: any): prop is ValueProperty =>
  prop.fieldAlias && !prop.converter;

const isObjectProperty = (prop: any): prop is ObjectProperty =>
  prop.converter && !prop.findCommand;

const isNestedProperty = (prop: any): prop is NestedProperty =>
  prop.converter && prop.findCommand;

export class RowConverter {
  private _properties: Record<string, ValueProperty | ObjectProperty> = {};
  private _propertyKeys?: string[];

  constructor(
    public resultType: Type,
    public parent?: RowConverter,
  ) {}

  addValueProperty(args: {
    name: string;
    fieldAlias: string;
    dataType?: DataType;
    parse?: ColumnTransformFunction;
  }): ValueProperty {
    this._propertyKeys = undefined;
    const item: ValueProperty = {
      fieldAlias: args.fieldAlias,
      dataType: args.dataType,
      parse: args.parse,
    };
    this._properties[args.name] = item;
    return item;
  }

  addObjectProperty(args: { name: string; type: Type }): ObjectProperty {
    this._checkCircularDep(args.type);
    this._propertyKeys = undefined;
    const converter = new RowConverter(args.type, this);
    const item: ObjectProperty = {
      converter,
      type: args.type,
    };
    this._properties[args.name] = item;
    return item;
  }

  addNestedProperty(args: {
    name: string;
    type: Type;
    findCommand: FindCommand;
    parentField: string;
    keyField: string;
    sort?: string[];
  }): NestedProperty {
    this._checkCircularDep(args.type);
    const converter = new RowConverter(args.type, this);
    const item: NestedProperty = {
      converter,
      type: args.type,
      parentField: args.parentField,
      keyField: args.keyField,
      findCommand: args.findCommand,
      sort: args.sort,
      paramValues: [],
    };
    this._properties[args.name] = item;
    return item;
  }

  get keys(): string[] {
    if (!this._propertyKeys) this._propertyKeys = Object.keys(this._properties);
    return this._propertyKeys;
  }

  async transform(
    connection: SqbConnection,
    fields: FieldInfoMap,
    rows: any,
    onTransform?: Repository.TransformRowFunction,
  ): Promise<any[]> {
    const rowLen = rows.length;
    const result: any[] = [];
    for (let rowIdx = 0; rowIdx < rowLen; rowIdx++) {
      const row = rows[rowIdx];
      const o = (await this._rowToObject(connection, fields, row)) || {};
      if (onTransform) onTransform(fields, row, o);
      result.push(o);
    }
    if (!this.keys) return result;

    await this._iterateForNested(this, connection, fields, rows, result);

    // Return only non empty objects
    return result.filter(x => !!x);
  }

  private _rowToObject(
    executor: SqbConnection,
    fields: FieldInfoMap,
    row: any[],
  ): any {
    // Cache keys for better performance
    const fieldKeys = this.keys;
    const fieldsLen = fieldKeys.length;
    let result: any;
    for (let elIdx = 0; elIdx < fieldsLen; elIdx++) {
      const elKey = fieldKeys[elIdx];
      const prop = this._properties[elKey];
      if (isValueProperty(prop)) {
        const field = fields.get(prop.fieldAlias);
        if (field) {
          let v = row[field.index];
          if (typeof prop.parse === 'function') v = prop.parse(v, elKey);
          if (v != null) {
            result = result || {};
            if (prop.dataType === DataType.JSON && typeof v === 'string')
              v = JSON.parse(v);
            result[elKey] = v;
          }
        }
      } else if (isNestedProperty(prop)) {
        // One2Many Eager field
        // Keep a list of key field/value pairs to fetch rows for eager relation
        const _params = prop.paramValues;
        const f = fields.get(prop.parentField);
        const v = f && row[f.index];
        if (v != null && !_params.includes(v)) _params.push(v);
      } else if (isObjectProperty(prop)) {
        const v = prop.converter._rowToObject(executor, fields, row);
        if (v != null) {
          result = result || {};
          result[elKey] = v;
        }
      }
    }

    if (result) Object.setPrototypeOf(result, this.resultType.prototype);
    return result;
  }

  private async _iterateForNested(
    node: RowConverter,
    connection: SqbConnection,
    fields: FieldInfoMap,
    rows: any,
    result: object[],
  ): Promise<void> {
    // Fetch one-2-many related rows and merge with result rows
    const keys = node.keys;
    const propertyLen = keys.length;
    const promises: PromiseLike<void>[] = [];
    for (let propIdx = 0; propIdx < propertyLen; propIdx++) {
      const propKey = keys[propIdx];
      const prop = node._properties[propKey];
      if (isNestedProperty(prop)) {
        if (!(prop.paramValues && prop.paramValues.length)) continue;
        const resultType = this.resultType;
        const promise = (async function (p: NestedProperty) {
          const findCommand = p.findCommand;
          let fld;
          const map = new Map<any, any[]>();
          const r = await findCommand.execute({
            connection,
            limit: findCommand.maxEagerFetch + 1,
            params: { [p.parentField]: p.paramValues },
            onTransformRow: (_fields, row, obj) => {
              fld = fld || _fields.get('' + p.keyField);
              const keyValue = fld && row[fld.index];
              if (keyValue != null) {
                const keyValues = Array.isArray(keyValue)
                  ? keyValue
                  : [keyValue];
                keyValues.forEach(k => {
                  let arr = map.get(k);
                  if (!arr) {
                    arr = [];
                    map.set(k, arr);
                  }
                  arr.push(obj);
                });
              }
            },
          });
          if (r.length > findCommand.maxEagerFetch) {
            throw new Error(
              `Number of returning rows for "${propKey}" exceeds maxEagerFetch limit`,
            );
          }

          for (let i = 0; i < result.length; i++) {
            const row = rows[i];
            let obj = result[i];
            if (!obj) {
              obj = {};
              Object.setPrototypeOf(result, resultType.prototype);
            }
            const f = fields.get('' + p.parentField);
            const keyValue = f && row[f.index];
            if (keyValue != null) {
              const arr = map.get(keyValue);
              if (arr) {
                obj[propKey] = arr;
              }
            }
          }
        })(prop);
        promises.push(promise);
      } else if (isObjectProperty(prop)) {
        promises.push(
          this._iterateForNested(
            prop.converter,
            connection,
            fields,
            rows,
            result,
          ),
        );
      }
    }
    await Promise.all(promises);
  }

  private _checkCircularDep(t: Type): void {
    if (this.resultType === t) throw new Error('Circular fields requested');
    if (this.parent) this.parent._checkCircularDep(t);
  }
}
