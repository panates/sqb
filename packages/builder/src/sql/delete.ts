import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { isRaw } from '../type-guards.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { And } from './operators/and.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { Query } from './query.js';

class DeleteClass extends Query {
  _table!: TableName | Raw;
  _where?: LogicalOperator;

  get _type(): SerializationType {
    return SerializationType.DELETE_QUERY;
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
      where: this._serializeWhere(ctx),
    };
    return ctx.serialize(this._type, o, () => this.__defaultSerialize(ctx, o));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return 'delete from ' + o.table + (o.where ? '\n' + o.where : '');
  }

  /**
   *
   */
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

export const Delete = function (
  this: Delete,
  tableName: string | TableName | Raw,
) {
  if (!(this instanceof Delete)) return new Delete(tableName);
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
      'String or Raw instance required as first argument (tableName) for Delete',
    );
  }
  this._table =
    tableName instanceof TableName
      ? tableName
      : typeof tableName === 'string'
        ? TableName(tableName)
        : tableName;
} as DeleteCtor;

Delete.prototype = DeleteClass.prototype;
Delete.prototype.constructor = Delete;

export interface Delete extends DeleteClass {}
