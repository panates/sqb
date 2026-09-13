import { splitString } from 'fast-tokenizer';
import { coerceToInt } from 'putil-varhelpers';
import { SerializationType } from '../enums.js';
import { printArray } from '../helpers.js';
import { SqlElement } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { isJoin, isSelect, isTableName } from '../type-guards.js';
import { Field } from './elements/field.js';
import { GroupColumn } from './elements/group-column.js';
import { Join } from './elements/join.js';
import { OrderColumn } from './elements/order-column.js';
import { Raw } from './elements/raw.js';
import { TableName } from './elements/table-name.js';
import { And } from './operators/and.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { Query } from './query.js';
import type { Union } from './union.js';

/**
 * A `SELECT` query builder. Build one up fluently with `.addColumn()`,
 * `.from()`, `.join()`, `.where()`, `.groupBy()`, `.orderBy()`,
 * `.limit()`/`.offset()`, then call `.generate()` (inherited from
 * {@link Query}) to produce SQL text.
 *
 * A `Select` can also be embedded as a sub-select: pass it directly as a
 * `.from()`/`.join()` table argument or a comparison operator's operand
 * (call `.as(alias)` first when embedding it as a `FROM`/column
 * sub-select, since an alias is required there).
 */
class SelectClass extends Query {
  _tables?: SqlElement[];
  _columns?: SqlElement[];
  _joins?: Join[];
  _where?: LogicalOperator;
  _groupBy?: (GroupColumn | SqlElement)[];
  _orderBy?: (OrderColumn | SqlElement)[];
  _limit?: number;
  _offset?: number;
  _alias?: string;
  _distinct?: boolean;

  get _type(): SerializationType {
    return SerializationType.SELECT_QUERY;
  }

  /**
   * Adds one or more columns to the `SELECT` column list. With no columns
   * ever added, the query serializes to `select *`.
   *
   * @param column - Column names (accepts a single comma-separated string, e.g. `'id, name as n'`), nested arrays of names, or {@link SqlElement} expressions (e.g. a {@link Field}, {@link Count}, sub-`Select`). Falsy entries are ignored.
   */
  addColumn(...column: (string | string[] | SqlElement)[]): this {
    const self = this;
    this._columns = this._columns || [];
    for (const arg of column) {
      if (!arg) continue;
      if (Array.isArray(arg)) self.addColumn(...arg);
      else {
        if (typeof arg === 'string') {
          const items = splitString(arg, {
            brackets: true,
            delimiters: ',',
            quotes: true,
            keepQuotes: true,
            keepBrackets: true,
          });
          items.forEach(item => {
            this._columns!.push(Field(item));
          });
        } else this._columns.push(arg);
      }
    }
    return this;
  }

  /**
   * Defines the `FROM` part of the query, replacing any tables set by a
   * previous call.
   *
   * @param table - Table names (parsed as `[schema.]table [as alias]`), or {@link TableName}/{@link Raw}/sub-`Select`/`Union` instances. A sub-select requires an alias (set via `.as(...)`).
   */
  from(...table: (string | TableName | Raw | SelectClass | Union)[]): this {
    this._tables = [];
    for (const arg of table) {
      if (!arg) continue;
      this._tables.push(
        isTableName(arg)
          ? arg
          : typeof arg === 'string'
            ? new TableName(arg)
            : arg,
      );
    }
    return this;
  }

  /**
   * Adds one or more `JOIN` clauses (e.g. {@link InnerJoin},
   * {@link LeftJoin}) to the query, in the order given.
   *
   * @throws {TypeError} If an argument isn't a `Join` instance.
   */
  join(...join: Join[]): this {
    this._joins = this._joins || [];
    for (const arg of join) {
      if (!arg) continue;
      if (!isJoin(arg)) throw new TypeError('Join statement required');
      this._joins.push(arg);
    }
    return this;
  }

  /**
   * Adds conditions to the `WHERE` clause, combined with the existing
   * conditions (and each other) using `AND`.
   *
   * @param condition - One or more {@link Operator}/{@link Raw} instances, or a plain object condition (e.g. `{ age: { gt: 18 } }`) resolved via {@link OperatorsMap}.
   */
  where(...condition: (SqlElement | Object)[]): this {
    this._where = this._where || new And();
    this._where.add(...condition);
    return this;
  }

  /**
   * Adds one or more columns to the `GROUP BY` clause.
   *
   * @param field - Column names or {@link SqlElement} expressions.
   */
  groupBy(...field: (string | SqlElement)[]): this {
    this._groupBy = this._groupBy || [];
    for (const arg of field) {
      if (!arg) continue;
      this._groupBy.push(typeof arg === 'string' ? new GroupColumn(arg) : arg);
    }
    return this;
  }

  /**
   * Adds one or more columns to the `ORDER BY` clause.
   *
   * @param field - Column names (a leading `-`, or a trailing `desc`/`dsc`/`descending`, sorts that column descending), or {@link SqlElement} expressions.
   */
  orderBy(...field: (string | SqlElement)[]): this {
    this._orderBy = this._orderBy || [];
    for (const arg of field) {
      if (!arg) continue;
      this._orderBy.push(typeof arg === 'string' ? new OrderColumn(arg) : arg);
    }
    return this;
  }

  /**
   * Sets the alias this query is embedded under, required whenever it's
   * used as a sub-select in a `FROM`, `JOIN`, or column position.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Sets the `LIMIT` (maximum row count) for the query.
   *
   * @param limit - Coerced to an integer.
   */
  limit(limit: number): this {
    this._limit = coerceToInt(limit);
    return this;
  }

  /**
   * Sets the `OFFSET` (row skip count) for the query.
   *
   * @param offset - Coerced to an integer.
   */
  offset(offset: number): this {
    this._offset = coerceToInt(offset);
    return this;
  }

  /**
   * Adds the `DISTINCT` keyword to the query.
   */
  distinct(): this {
    this._distinct = true;
    return this;
  }

  /**
   * Registers a listener for the `'fetch'` event. This query never emits it
   * itself - it exists so a consumer (e.g. `@sqb/connect`) executing the
   * query can notify listeners as rows are fetched.
   */
  onFetch(listener: (...args: any[]) => void): this {
    this.on('fetch', listener);
    return this;
  }

  /** One-time variant of {@link onFetch}. */
  onceFetch(listener: (...args: any[]) => void): this {
    this.once('fetch', listener);
    return this;
  }

  /**
   * Serializes this query into a `select ...` statement, assembling the
   * column/from/join/where/group-by/order-by fragments produced by the
   * `__serialize*` helpers below.
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      query: this,
      columns: this.__serializeSelectColumns(ctx),
      from: this.__serializeFrom(ctx),
      join: this.__serializeJoins(ctx),
      where: this.__serializeWhere(ctx),
      groupBy: this.__serializeGroupColumns(ctx),
      orderBy: this.__serializeOrderColumns(ctx),
      limit: this._limit,
      offset: this._offset,
      optimizerHint: '',
    };

    return ctx.serialize(this._type, o, () => {
      let out = 'select';
      if (this._distinct) out += ' distinct';
      if (o.optimizerHint) out += ' ' + o.optimizerHint;
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

  /** Serializes the `SELECT` column list (`* ` if none were added). */
  protected __serializeSelectColumns(ctx: SerializeContext): string {
    const arr: string[] = [];
    if (this._columns) {
      for (const t of this._columns) {
        const s = ctx.anyToSQL(t);
        // t._serialize(ctx);
        if (s) {
          if (isSelect(t)) {
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

  /** Serializes the `FROM` clause, requiring an alias on any sub-select table. */
  protected __serializeFrom(ctx: SerializeContext): string {
    const arr: { text: string; source: any }[] = [];
    if (this._tables) {
      for (const t of this._tables) {
        const s = t._serialize(ctx);
        /* istanbul ignore else */
        if (s) {
          if (isSelect(t)) {
            if (!t._alias)
              throw new TypeError('Alias required for sub-select in "from"');
            arr.push({
              source: t,
              text: '\n\t(' + s + ') ' + t._alias,
            });
          } else
            arr.push({
              source: t,
              text: s,
            });
        }
      }
    }
    return ctx.serialize(SerializationType.SELECT_QUERY_FROM, arr, () => {
      const s = arr.map(x => x.text).join(',');
      return s ? 'from' + (s.substring(0, 1) !== '\n' ? ' ' : '') + s : '';
    });
  }

  /** Serializes all `JOIN` clauses, one per line. */
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

  /** Serializes the `WHERE` clause, or an empty string if none was set. */
  protected __serializeWhere(ctx: SerializeContext): string {
    if (!this._where) return '';
    const s = this._where._serialize(ctx);
    return ctx.serialize(SerializationType.CONDITIONS_BLOCK, s, () =>
      /* istanbul ignore next */
      s ? 'where ' + s : '',
    );
  }

  /** Serializes the `GROUP BY` clause, or an empty string if none was set. */
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

  /** Serializes the `ORDER BY` clause, or an empty string if none was set. */
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

interface SelectCtor {
  new (...column: (string | string[] | SqlElement)[]): Select;
  (...column: (string | string[] | SqlElement)[]): Select;
  prototype: Select;
}

/**
 * Creates a `SELECT` query builder. Callable with or without `new`.
 *
 * @param column - Initial columns to select, same accepted forms as {@link SelectClass.addColumn}; may be omitted and added later via `.addColumn(...)`.
 *
 * @example
 * ```ts
 * Select('id', 'name')
 *   .from('users')
 *   .where({ active: true })
 *   .orderBy('name')
 *   .generate({ dialect: 'postgres' });
 * ```
 */
export const Select = function (
  this: Select,
  ...column: (string | string[] | SqlElement)[]
) {
  if (!(this instanceof Select)) return new Select(...column);
  Query.call(this);
  if (column.length) this.addColumn(...column);
} as SelectCtor;

Select.prototype = SelectClass.prototype;
Select.prototype.constructor = Select;

export interface Select extends SelectClass {}
