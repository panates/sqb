import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SerializeContext } from '../serialize-context.js';
import { isRaw, isSelect, isTableName } from '../type-guards.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { And } from './operators/and.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { Query } from './query.js';
import { ReturningQuery } from './returning-query.js';
import type { Select } from './select.js';

/**
 * An `UPDATE ... SET ...` query builder, extending {@link ReturningQuery}
 * for `.returning(...)` support. Construct via the exported {@link Update}
 * factory rather than this class directly.
 */
class UpdateClass extends ReturningQuery {
  _table!: TableName | Raw;
  _input: any;
  _where?: LogicalOperator;

  get _type(): SerializationType {
    return SerializationType.UPDATE_QUERY;
  }

  /**
   * Adds conditions to the `WHERE` clause, combined with the existing
   * conditions (and each other) using `AND`.
   *
   * @param operator - One or more {@link Operator}/{@link Raw} instances, or a plain object condition resolved via {@link OperatorsMap}.
   */
  where(...operator: any[]): this {
    this._where = this._where || new And();
    this._where.add(...operator);
    return this;
  }

  /**
   * Serializes this query into an `update ... set ...` statement.
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      table: this._table._serialize(ctx),
      values: this.__serializeValues(ctx),
      where: this.__serializeWhere(ctx),
      returning: this.__serializeReturning(ctx),
    };
    return ctx.serialize(this._type, o, () => this.__defaultSerialize(ctx, o));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    let out = 'update ' + o.table + ' set \n\t' + o.values + '\b';
    if (o.where) out += '\n' + o.where;
    if (o.returning) out += '\n' + o.returning;
    return out;
  }

  /**
   * Serializes the `SET` clause: each input key/value pair as
   * `field = value`, with reserved-word field names escaped.
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
      const a = arr.map(o => ctx.escapeReserved(o.field) + ' = ' + o.value);
      return printArray(a, ',');
    });
  }

  /** Serializes the `WHERE` clause, or an empty string if none was set. */
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

/**
 * Creates an `UPDATE` query builder. Callable with or without `new`.
 *
 * @param tableName - The target table name, {@link TableName}, or a {@link Raw} expression.
 * @param input - A plain object of column-name/value pairs to set.
 * @throws {TypeError} If `tableName` isn't a string, `TableName`, or `Raw`, or `input` isn't a plain object, `Select`, or `Raw`.
 *
 * @example
 * ```ts
 * Update('users', { active: false })
 *   .where({ id: 5 })
 *   .generate({ dialect: 'postgres' });
 * ```
 */
export const Update = function (
  this: Update,
  tableName: string | TableName | Raw,
  input: Record<string, any> | Select | Raw,
) {
  if (!(this instanceof Update)) return new Update(tableName, input);
  Query.call(this);
  if (!(
    tableName &&
    (isTableName(tableName) ||
      typeof tableName === 'string' ||
      isRaw(tableName))
  )) {
    throw new TypeError(
      'String or Raw instance required as first argument (tableName) for Update',
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
      'Object or Raw instance required as second argument (input) for Update',
    );
  }
  this._table = isTableName(tableName)
    ? tableName
    : typeof tableName === 'string'
      ? new TableName(tableName)
      : tableName;
  this._input = input;
} as UpdateCtor;

Update.prototype = UpdateClass.prototype;
Update.prototype.constructor = Update;

export interface Update extends UpdateClass {}
