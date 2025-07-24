import { coerceToInt } from 'putil-varhelpers';
import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { FieldExpression } from '../sql-objects/field-expression.js';
import { GroupColumn } from '../sql-objects/group-column.js';
import { JoinStatement } from '../sql-objects/join-statement.js';
import { LogicalOperator } from '../sql-objects/operators/logical-operator.js';
import { OpAnd } from '../sql-objects/operators/op-and.js';
import { OrderColumn } from '../sql-objects/order-column.js';
import { RawStatement } from '../sql-objects/raw-statement.js';
import { TableName } from '../sql-objects/table-name.js';
import { isJoinStatement, isSerializable } from '../typeguards.js';
import { Query } from './query.js';
import type { UnionQuery } from './union-query.js';

export class SelectQuery extends Query {
  _tables?: Serializable[];
  _columns?: Serializable[];
  _joins?: JoinStatement[];
  _where?: LogicalOperator;
  _groupBy?: (GroupColumn | Serializable)[];
  _orderBy?: (OrderColumn | Serializable)[];
  _limit?: number;
  _offset?: number;
  _alias?: string;
  _distinct?: boolean;

  constructor(...column: (string | string[] | Serializable)[]) {
    super();
    if (column.length) this.addColumn(...column);
  }

  get _type(): SerializationType {
    return SerializationType.SELECT_QUERY;
  }

  /**
   * Adds columns to query.
   */
  addColumn(...column: (string | string[] | Serializable)[]): this {
    const self = this;
    this._columns = this._columns || [];
    for (const arg of column) {
      if (!arg) continue;
      if (Array.isArray(arg)) self.addColumn(...arg);
      else
        this._columns.push(
          isSerializable(arg) ? arg : new FieldExpression(arg),
        );
    }
    return this;
  }

  /**
   * Defines "from" part of  query.
   */
  from(...table: (string | RawStatement | SelectQuery | UnionQuery)[]): this {
    this._tables = [];
    for (const arg of table) {
      if (!arg) continue;
      this._tables.push(typeof arg === 'string' ? new TableName(arg) : arg);
    }
    return this;
  }

  /**
   * Adds "join" statements to query
   */
  join(...join: JoinStatement[]): this {
    this._joins = this._joins || [];
    for (const arg of join) {
      if (!arg) continue;
      if (!isJoinStatement(arg)) throw new TypeError('Join statement required');
      this._joins.push(arg);
    }
    return this;
  }

  /**
   * Defines "where" part of query
   */
  where(...condition: (Serializable | Object)[]): this {
    this._where = this._where || new OpAnd();
    this._where.add(...condition);
    return this;
  }

  /**
   * Defines "where" part of query
   */
  groupBy(...field: (string | Serializable)[]): this {
    this._groupBy = this._groupBy || [];
    for (const arg of field) {
      if (!arg) continue;
      this._groupBy.push(typeof arg === 'string' ? new GroupColumn(arg) : arg);
    }
    return this;
  }

  /**
   * Defines "order by" part of query.
   */
  orderBy(...field: (string | Serializable)[]): this {
    this._orderBy = this._orderBy || [];
    for (const arg of field) {
      if (!arg) continue;
      this._orderBy.push(typeof arg === 'string' ? new OrderColumn(arg) : arg);
    }
    return this;
  }

  /**
   * Sets alias for sub-select queries
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Sets limit for query
   */
  limit(limit: number): this {
    this._limit = coerceToInt(limit);
    return this;
  }

  /**
   * Sets offset for query
   */
  offset(offset: number): this {
    this._offset = coerceToInt(offset);
    return this;
  }

  /**
   * Enables distinct mode
   */
  distinct(): this {
    this._distinct = true;
    return this;
  }

  onFetch(listener: (...args: any[]) => void): this {
    this.on('fetch', listener);
    return this;
  }

  onceFetch(listener: (...args: any[]) => void): this {
    this.once('fetch', listener);
    return this;
  }

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      columns: this.__serializeSelectColumns(ctx),
      from: this.__serializeFrom(ctx),
      join: this.__serializeJoins(ctx),
      where: this.__serializeWhere(ctx),
      groupBy: this.__serializeGroupColumns(ctx),
      orderBy: this.__serializeOrderColumns(ctx),
      limit: this._limit,
      offset: this._offset,
    };

    return ctx.serialize(this._type, o, () => {
      let out = 'select';
      if (this._distinct) out += ' distinct';
      // columns part
      /* istanbul ignore else */
      if (o.columns) {
        out +=
          o.columns.indexOf('\n') >= 0
            ? '\n\t' + o.columns + '\b'
            : ' ' + o.columns;
      }

      // from part
      if (o.from) {
        out +=
          (o.columns.length > 60 || o.columns.indexOf('\n') >= 0 ? '\n' : ' ') +
          o.from;
      }

      // join part
      if (o.join) out += '\n' + o.join;

      // where part
      if (o.where) out += '\n' + o.where;

      // group by part
      if (o.groupBy) out += '\n' + o.groupBy;

      // order by part
      if (o.orderBy) out += '\n' + o.orderBy;

      return out;
    });
  }

  /**
   *
   */
  protected __serializeSelectColumns(ctx: SerializeContext): string {
    const arr: string[] = [];
    if (this._columns) {
      for (const t of this._columns) {
        const s = ctx.anyToSQL(t);
        // t._serialize(ctx);
        if (s) {
          if (t instanceof SelectQuery) {
            if (!t._alias)
              throw new TypeError('Alias required for sub-select in columns');
            arr.push(s + ' ' + t._alias);
          } else arr.push(s);
        }
      }
    }
    return ctx.serialize(
      SerializationType.SELECT_QUERY_COLUMNS,
      arr,
      () => printArray(arr) || '*',
    );
  }

  /**
   *
   */
  protected __serializeFrom(ctx: SerializeContext): string {
    const arr: string[] = [];
    if (this._tables) {
      for (const t of this._tables) {
        const s = t._serialize(ctx);
        /* istanbul ignore else */
        if (s) {
          if (t instanceof SelectQuery) {
            if (!t._alias)
              throw new TypeError('Alias required for sub-select in "from"');
            arr.push('\n\t(' + s + ') ' + t._alias);
          } else arr.push(s);
        }
      }
    }
    return ctx.serialize(SerializationType.SELECT_QUERY_FROM, arr, () => {
      const s = arr.join(',');
      return s ? 'from' + (s.substring(0, 1) !== '\n' ? ' ' : '') + s : '';
    });
  }

  /**
   *
   */
  protected __serializeJoins(ctx: SerializeContext): string {
    const arr: string[] = [];
    if (this._joins) {
      for (const t of this._joins) {
        const s = t._serialize(ctx);
        /* istanbul ignore else */
        if (s) arr.push(s);
      }
    }
    return ctx.serialize(SerializationType.SELECT_QUERY_JOIN, arr, () =>
      arr.join('\n'),
    );
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

  /**
   *
   */
  protected __serializeGroupColumns(ctx: SerializeContext): string {
    const arr: string[] = [];
    if (this._groupBy) {
      for (const t of this._groupBy) {
        const s = t._serialize(ctx);
        /* istanbul ignore else */
        if (s) arr.push(s);
      }
    }
    return ctx.serialize(SerializationType.SELECT_QUERY_GROUPBY, arr, () => {
      const s = printArray(arr);
      return s ? 'group by ' + s : '';
    });
  }

  protected __serializeOrderColumns(ctx: SerializeContext): string {
    const arr: string[] = [];
    if (this._orderBy) {
      for (const t of this._orderBy) {
        const s = t._serialize(ctx);
        /* istanbul ignore else */
        if (s) arr.push(s);
      }
    }
    return ctx.serialize(SerializationType.SELECT_QUERY_ORDERBY, arr, () => {
      const s = printArray(arr);
      return s ? 'order by ' + s : '';
    });
  }
}
