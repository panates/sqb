import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { isRaw, isSqlElement } from '../type-guards.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { And } from './operators/and.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { Query } from './query.js';

/**
 * A `DELETE FROM ...` query builder. Construct via the exported
 * {@link Delete} factory rather than this class directly.
 */
class DeleteClass extends Query {
  _table!: TableName | Raw;
  _where?: LogicalOperator;

  get _type(): SerializationType {
    return SerializationType.DELETE_QUERY;
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
   * Serializes this query into a `delete from ...` statement.
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      table: this._table._serialize(ctx),
      where: this._serializeWhere(ctx),
    };
    return ctx.serialize(this._type, o, () => this.__defaultSerialize(ctx, o));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return 'delete from ' + o.table + (o.where ? '\n' + o.where : '');
  }

  /** Serializes the `WHERE` clause, or an empty string if none was set. */
  _serializeWhere(ctx: SerializeContext): string {
    if (!this._where) return '';
    const s = this._where._serialize(ctx);
    return ctx.serialize(SerializationType.CONDITIONS_BLOCK, s, () =>
      /* istanbul ignore next */
      s ? 'where ' + s : '',
    );
  }
}

interface DeleteCtor {
  new (tableName: string | TableName | Raw): Delete;
  (tableName: string | TableName | Raw): Delete;
  prototype: Delete;
}

/**
 * Creates a `DELETE` query builder. Callable with or without `new`.
 *
 * @param tableName - The target table name, {@link TableName}, or a {@link Raw} expression.
 * @throws {TypeError} If `tableName` isn't a string, `TableName`, or `Raw`.
 *
 * @example
 * ```ts
 * Delete('users').where({ id: 5 }).generate({ dialect: 'postgres' });
 * ```
 */
export const Delete = function (
  this: Delete,
  tableName: string | TableName | Raw,
) {
  if (!(this instanceof Delete)) return new Delete(tableName);
  Query.call(this);
  if (!(
    tableName &&
    (isSqlElement(tableName, SerializationType.TABLE_NAME) ||
      typeof tableName === 'string' ||
      isRaw(tableName))
  )) {
    throw new TypeError(
      'String or Raw instance required as first argument (tableName) for Delete',
    );
  }
  this._table = isSqlElement(tableName, SerializationType.TABLE_NAME)
    ? tableName
    : typeof tableName === 'string'
      ? TableName(tableName)
      : tableName;
} as DeleteCtor;

Delete.prototype = DeleteClass.prototype;
Delete.prototype.constructor = Delete;

export interface Delete extends DeleteClass {}
