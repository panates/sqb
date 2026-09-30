import { DataType } from '@sqb/builder';
import type { Type } from 'ts-gems';
import type { FieldInfoMap } from '../../client/field-info-map.js';
import type { SqbConnection } from '../../client/sqb-connection.js';
import type { FieldInfo } from '../../client/types.js';
import type { ColumnTransformFunction } from '../orm.type.js';
import type { Repository } from '../repository.class.js';
import type { FindCommand } from './find.command.js';

/** A plain scalar output property, read directly off the flat result row by its `fieldAlias` (a `FindCommand`-assigned `SELECT` column alias). */
export interface ValueProperty {
  fieldAlias: string;
  dataType?: DataType;
  parse?: ColumnTransformFunction;
}

/** An embedded/to-one-association output property, built by a nested `RowConverter` reading from the same flat result row. */
export interface ObjectProperty {
  converter: RowConverter;
  type: Type;
}

/** A to-many eager-loaded association output property: its rows come from a separate `findCommand` execution, matched back to parent rows by `keyField`/`parentField`. */
export interface NestedProperty {
  converter: RowConverter;
  type: Type;
  /** The parent row's own key-column alias (read off the main query's result). */
  parentField: string;
  /** The nested query's key-column alias (read off its own result), matched against `parentField`'s value. */
  keyField: string;
  /** The command that fetches this association's rows, filtered to the accumulated `paramValues`. */
  findCommand: FindCommand;
  sort?: string[];
  /** Distinct parent key values collected while converting the main result set, used to filter `findCommand`'s query. */
  paramValues: any[];
}

const isValueProperty = (prop: any): prop is ValueProperty =>
  prop.fieldAlias && !prop.converter;

const isObjectProperty = (prop: any): prop is ObjectProperty =>
  prop.converter && !prop.findCommand;

const isNestedProperty = (prop: any): prop is NestedProperty =>
  prop.converter && prop.findCommand;

/**
 * Reshapes `FindCommand`'s flat result rows (one row per `SELECT`, joins
 * and all) back into entity-shaped objects, mirroring the entity's own
 * nesting: one `RowConverter` per embedded object or association, each
 * knowing how to pull its own properties off the (shared) flat row.
 * To-many associations are the exception - resolved as a second round of
 * queries after the main result set is converted, via
 * {@link RowConverter._iterateForNested}.
 */
export class RowConverter {
  private _properties: Record<string, ValueProperty | ObjectProperty> = {};
  private _propertyKeys?: string[];

  /**
   * @param resultType - The entity class this converter builds instances of.
   * @param parent - The enclosing converter, if this one converts a nested (embedded/associated) object - used only for circular-reference detection.
   */
  constructor(
    public resultType: Type,
    public parent?: RowConverter,
  ) {}

  /** Registers a scalar output property read from the flat result row. */
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

  /** Registers an embedded/to-one-association output property, creating its own nested converter (registered as this converter's `parent`). */
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

  /** Registers a to-many eager-loaded association output property, resolved separately after the main result set is converted. */
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

  /** Registered property names, in registration order (cached until the next `addXProperty` call). */
  get keys(): string[] {
    if (!this._propertyKeys) this._propertyKeys = Object.keys(this._properties);
    return this._propertyKeys;
  }

  /**
   * Converts every raw result row into its output object (via
   * {@link RowConverter._rowToObject}), then resolves any nested to-many
   * associations (via {@link RowConverter._iterateForNested}) and merges
   * their rows in, filtering out rows that produced no output object at
   * all.
   */
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

    // Return only non-empty objects
    return result.filter(x => !!x);
  }

  /**
   * Builds one output object from a single flat result row: copies value
   * properties across (applying `parse`/JSON-decoding as needed), recurses
   * into nested object converters, and records this row's key value against
   * any nested (to-many) property for later batch resolution. Returns
   * `undefined` if every registered property was absent/null for this row.
   */
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

  /**
   * Resolves every nested (to-many) property under `node`: runs each one's
   * `findCommand` once for all collected parent key values, groups the
   * results back by key, and assigns each parent's matching rows onto its
   * output object - then recurses into any nested `ObjectProperty`
   * converters, keeping their (filtered) `rows`/`result` arrays aligned by
   * index throughout.
   *
   * @throws {Error} If a to-many association's row count exceeds its `findCommand`'s `maxEagerFetch`.
   */
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
        const promise = Promise.resolve(prop).then(
          async (p: NestedProperty) => {
            const findCommand = p.findCommand;
            let fld: FieldInfo;
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
          },
        );
        promises.push(promise);
      } else if (isObjectProperty(prop)) {
        // Keep subResult and subRows in lockstep: rows whose embedded value
        // is falsy are dropped from subResult, so the corresponding raw row
        // must be dropped from subRows at the same position - otherwise
        // subResult[i] and rows[i] drift apart once any row is skipped, and
        // the recursive nested-property lookup below reads key values from
        // the wrong row.
        const subResult: any[] = [];
        const subRows: any[] = [];
        result.forEach((r, idx) => {
          const v = r[propKey];
          if (v) {
            subResult.push(v);
            subRows.push(rows[idx]);
          }
        });
        promises.push(
          this._iterateForNested(
            prop.converter,
            connection,
            fields,
            subRows,
            subResult,
          ),
        );
      }
    }
    await Promise.all(promises);
  }

  /**
   * Guards against an infinite projection loop (e.g. entity A embeds B
   * which embeds A again) by walking up `parent` links.
   *
   * @throws {Error} If `t` already appears as an ancestor converter's `resultType`.
   */
  private _checkCircularDep(t: Type): void {
    if (this.resultType === t) throw new Error('Circular fields requested');
    if (this.parent) this.parent._checkCircularDep(t);
  }
}
