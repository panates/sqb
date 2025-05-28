import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { LogicalOperator } from '../sql-objects/operators/logical-operator.js';
import { OpAnd } from '../sql-objects/operators/op-and.js';
import { RawStatement } from '../sql-objects/raw-statement.js';
import { TableName } from '../sql-objects/table-name.js';
import { isRawStatement } from '../typeguards.js';
import { Query } from './query.js';

export class DeleteQuery extends Query {
  _table: TableName | RawStatement;
  _where?: LogicalOperator;

  constructor(tableName: string | RawStatement) {
    super();
    if (
      !tableName ||
      !(typeof tableName === 'string' || isRawStatement(tableName))
    ) {
      throw new TypeError(
        'String or Raw instance required as first argument (tableName) for UpdateQuery',
      );
    }
    this._table =
      typeof tableName === 'string' ? new TableName(tableName) : tableName;
  }

  get _type(): SerializationType {
    return SerializationType.DELETE_QUERY;
  }

  /**
   * Defines "where" part of query
   */
  where(...operator): this {
    this._where = this._where || new OpAnd();
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
