import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { isRaw } from '../type-guards.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { And } from './operators/and.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { Query } from './query.js';
import { ReturningQuery } from './returning-query.js';
import type { Select } from './select.js';

class UpdateClass extends ReturningQuery {
  _table!: TableName | Raw;
  _input: any;
  _where?: LogicalOperator;

  get _type(): SerializationType {
    return SerializationType.UPDATE_QUERY;
  }

  /**
   * Defines "where" part of query
   */
  where(...operator: any[]): this {
    this._where = this._where || new And();
    this._where.add(...operator);
    return this;
  }

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      table: this._table._serialize(ctx),
      values: this.__serializeValues(ctx),
      where: this.__serializeWhere(ctx),
      returning: this.__serializeReturning(ctx),
    };
    let out = 'update ' + o.table + ' set \n\t' + o.values + '\b';
    if (o.where) out += '\n' + o.where;
    if (o.returning) out += '\n' + o.returning;
    return out;
  }

  /**
   *
   */
  protected __serializeValues(ctx: SerializeContext): string {
    const arr: { field: string; value: any }[] = [];
    const allValues = this._input;
    for (const n of Object.getOwnPropertyNames(allValues)) {
      const value = ctx.anyToSQL(allValues[n]);
      arr.push({
        field: n,
        value,
      });
    }
    return ctx.serialize(SerializationType.UPDATE_QUERY_VALUES, arr, () => {
      const a = arr.map(o => o.field + ' = ' + o.value);
      return printArray(a, ',');
    });
  }

  /**
   *
   */
  protected __serializeWhere(ctx: SerializeContext): string {
    if (!this._where) return '';
    const s = this._where._serialize(ctx);
    return ctx.serialize(SerializationType.CONDITIONS_BLOCK, s, () =>
      /* istanbul ignore next */
      s ? 'where ' + s : '',
    );
  }
}

interface UpdateCtor {
  new (
    tableName: string | TableName | Raw,
    input: Record<string, any> | Select | Raw,
  ): Update;
  (
    tableName: string | TableName | Raw,
    input: Record<string, any> | Select | Raw,
  ): Update;
  prototype: Update;
}

export const Update = function (
  this: Update,
  tableName: string | TableName | Raw,
  input: Record<string, any> | Select | Raw,
) {
  if (!(this instanceof Update)) return new Update(tableName, input);
  Query.call(this);
  if (
    !(
      tableName &&
      (tableName instanceof TableName ||
        typeof tableName === 'string' ||
        isRaw(tableName))
    )
  ) {
    throw new TypeError(
      'String or Raw instance required as first argument (tableName) for Update',
    );
  }
  if (
    !input ||
    !(
      (typeof input === 'object' && !Array.isArray(input)) ||
      (input instanceof Serializable &&
        (input._type === SerializationType.SELECT_QUERY ||
          input._type === SerializationType.RAW))
    )
  ) {
    throw new TypeError(
      'Object or Raw instance required as second argument (input) for Update',
    );
  }
  this._table =
    tableName instanceof TableName
      ? tableName
      : typeof tableName === 'string'
        ? new TableName(tableName)
        : tableName;
  this._input = input;
} as UpdateCtor;

Update.prototype = UpdateClass.prototype;
Update.prototype.constructor = Update;

export interface Update extends UpdateClass {}
