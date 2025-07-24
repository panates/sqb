import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SerializeContext } from '../serialize-context.js';
import type { RawStatement } from '../sql-objects/raw-statement.js';
import { TableName } from '../sql-objects/table-name.js';
import {
  isRawStatement,
  isSelectQuery,
  isSerializable,
} from '../typeguards.js';
import { ReturningQuery } from './returning-query.js';

export class InsertQuery extends ReturningQuery {
  _table: TableName | RawStatement;
  _input: any;

  constructor(tableName: string | RawStatement, input) {
    super();
    if (
      !tableName ||
      !(typeof tableName === 'string' || isRawStatement(tableName))
    ) {
      throw new TypeError(
        'String or Raw instance required as first argument (tableName) for InsertQuery',
      );
    }
    if (
      !input ||
      !((typeof input === 'object' && !Array.isArray(input)) || input.isSelect)
    ) {
      throw new TypeError(
        'Object or SelectQuery instance required as second argument (input) for InsertQuery',
      );
    }
    this._table =
      typeof tableName === 'string' ? new TableName(tableName) : tableName;
    this._input = input;
  }

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
    if (isSelectQuery(this._input)) {
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
