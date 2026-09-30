import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SerializeContext } from '../serialize-context.js';
import { isRaw, isSelect, isSqlElement } from '../type-guards.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { Query } from './query.js';
import { ReturningQuery } from './returning-query.js';
import { Select } from './select.js';

/**
 * An `INSERT INTO ... VALUES (...)` query builder, extending
 * {@link ReturningQuery} for `.returning(...)` support. Construct via the
 * exported {@link Insert} factory rather than this class directly.
 */
class InsertClass extends ReturningQuery {
  _table!: TableName | Raw;
  _input: any;

  get _type(): SerializationType {
    return SerializationType.INSERT_QUERY;
  }

  /**
   * Serializes this query into an `insert into ... values (...)` statement.
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      table: this._table._serialize(ctx),
      columns: this.__serializeColumns(ctx),
      values: this.__serializeValues(ctx),
      returning: this.__serializeReturning(ctx),
    };
    return ctx.serialize(this._type, o, () => this.__defaultSerialize(ctx, o));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
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
   * Serializes the inserted column-name list: the input object's own keys,
   * or (for an `INSERT ... SELECT`) the source select's column aliases.
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
      printArray(arr.map(c => ctx.escapeReserved(c))),
    );
  }

  /**
   * Serializes the `VALUES` list: the source select/raw's own SQL for an
   * `INSERT ... SELECT`/`INSERT ... (raw)`, or each input value converted
   * via `ctx.anyToSQL(...)` for a plain-object input.
   */
  protected __serializeValues(ctx: SerializeContext): string {
    if (isSqlElement(this._input)) return this._input._serialize(ctx);

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

/**
 * Creates an `INSERT` query builder. Callable with or without `new`.
 *
 * @param tableName - The target table name, or a {@link Raw} expression.
 * @param input - Either a plain object of column-name/value pairs to insert as a single row, or a {@link Select}/{@link Raw} to insert from (`INSERT ... SELECT`).
 * @throws {TypeError} If `tableName` isn't a string or `Raw`, or `input` isn't a plain object, `Select`, or `Raw`.
 *
 * @example
 * ```ts
 * Insert('users', { name: 'John', age: 30 })
 *   .returning('id')
 *   .generate({ dialect: 'postgres' });
 * ```
 */
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
      isSelect(input) ||
      isRaw(input)
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
 * Type guard for {@link Insert}; equivalent to `isInsert` in `type-guards.ts`.
 *
 * @param value - The value to test.
 */
export function isInsertQuery(value: any): value is Insert {
  return isSqlElement(value, SerializationType.INSERT_QUERY);
}
