import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SqlElement } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { isRaw, isSelect, isSerializable } from '../type-guards.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { Query } from './query.js';
import { ReturningQuery } from './returning-query.js';
import { Select } from './select.js';

class InsertClass extends ReturningQuery {
  _table!: TableName | Raw;
  _input: any;

  get _type(): SerializationType {
    return SerializationType.INSERT_QUERY;
  }

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      table: this._table._serialize(ctx),
      columns: this.__serializeColumns(ctx),
      values: this.__serializeValues(ctx),
      returning: this.__serializeReturning(ctx),
    };

    let out =
      'insert into ' +
      o.table +
      '\n\t(' +
      o.columns +
      ')\n\bvalues\n\t(' +
      o.values +
      ')\b';
    if (o.returning) out += '\n' + o.returning;
    return out;
  }

  /**
   *
   */
  protected __serializeColumns(ctx: SerializeContext): string {
    let arr: string[];
    if (isSelect(this._input)) {
      arr = [];
      const cols = this._input._columns;
      if (cols) {
        for (const col of cols) {
          if ((col as any)._alias) arr.push((col as any)._alias);
          else if ((col as any)._field) arr.push((col as any)._field);
        }
      }
    } else arr = Object.keys(this._input);
    return ctx.serialize(SerializationType.INSERT_QUERY_COLUMNS, arr, () =>
      printArray(arr),
    );
  }

  /**
   *
   */
  protected __serializeValues(ctx: SerializeContext): string {
    if (isSerializable(this._input)) return this._input._serialize(ctx);

    const arr: string[] = [];
    const allValues = this._input;
    for (const n of Object.keys(allValues)) {
      const s = ctx.anyToSQL(allValues[n]) || 'null';
      arr.push(s);
    }
    return ctx.serialize(SerializationType.INSERT_QUERY_VALUES, arr, () =>
      printArray(arr),
    );
  }
}

interface InsertCtor {
  new (
    tableName: string | Raw,
    input: Record<string, any> | Select | Raw,
  ): Insert;
  (tableName: string | Raw, input: Record<string, any> | Select | Raw): Insert;
  prototype: Insert;
}

export const Insert = function (
  this: Insert,
  tableName: string | Raw,
  input: Record<string, any> | Select | Raw,
) {
  if (!(this instanceof Insert)) return new Insert(tableName, input);
  Query.call(this);
  if (!tableName || !(typeof tableName === 'string' || isRaw(tableName))) {
    throw new TypeError(
      'String or Raw instance required as first argument (tableName) for Insert',
    );
  }
  if (
    !input ||
    !(
      (typeof input === 'object' && !Array.isArray(input)) ||
      (input instanceof SqlElement &&
        (input._type === SerializationType.SELECT_QUERY ||
          input._type === SerializationType.RAW))
    )
  ) {
    throw new TypeError(
      'Object or Select instance required as second argument (input) for Insert',
    );
  }
  this._table =
    typeof tableName === 'string' ? TableName(tableName) : tableName;
  this._input = input;
} as InsertCtor;

Insert.prototype = InsertClass.prototype;
Insert.prototype.constructor = Insert;

export interface Insert extends InsertClass {}

/**
 * Type guard for Insert
 * @param value
 */
export function isInsertQuery(value: any): value is Insert {
  return (
    isSerializable(value) && value._type === SerializationType.INSERT_QUERY
  );
}
