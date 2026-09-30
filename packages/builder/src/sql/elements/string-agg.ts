import { SerializationType } from '../../enums.js';
import { printArray } from '../../helpers.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Field } from './field.js';
import { OrderColumn } from './order-column.js';

/**
 * A `string_agg(field, 'delimiter' [order by ...])` expression, concatenating
 * a column's values across grouped rows into one delimited string.
 * Construct via the exported {@link StringAgg} factory rather than this
 * class directly.
 */
class StringAggClass extends SqlElement {
  _field!: SqlElement;
  _delimiter!: string;
  _orderBy?: (OrderColumn | SqlElement)[];
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.STRINGAGG_STATEMENT;
  }

  /**
   * Sets the delimiter placed between concatenated values (default: `,`).
   */
  delimiter(value: string): this {
    this._delimiter = value;
    return this;
  }

  /**
   * Adds one or more columns controlling the order values are concatenated in.
   *
   * @param field - Column names or {@link SqlElement} expressions.
   */
  orderBy(...field: (string | SqlElement)[]): this {
    this._orderBy = this._orderBy || [];
    for (const arg of field) {
      if (!arg) continue;
      this._orderBy.push(typeof arg === 'string' ? OrderColumn(arg) : arg);
    }
    return this;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `string_agg(field,'delimiter' [order by ...])`.
   */
  _serialize(ctx: SerializeContext): string {
    const q = {
      field: ctx.anyToSQL(this._field),
      delimiter: this._delimiter,
      orderBy: this.__serializeOrderColumns(ctx),
      alias: this._alias,
    };

    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
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

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return (
      'string_agg(' +
      o.field +
      ",'" +
      o.delimiter +
      "'" +
      (o.orderBy ? ' ' + o.orderBy : '') +
      ')' +
      (o.alias ? ' ' + o.alias : '')
    );
  }
}

interface StringAggCtor {
  new (field: string | SqlElement, delimiter?: string): StringAgg;
  (field: string | SqlElement, delimiter?: string): StringAgg;
  prototype: StringAgg;
}

/**
 * Creates a `string_agg(...)` expression. Callable with or without `new`.
 *
 * @param field - The column to concatenate; a string is parsed as a {@link Field}.
 * @param delimiter - The delimiter placed between values (default: `,`).
 */
export const StringAgg = function (
  this: StringAgg,
  field: string | SqlElement,
  delimiter?: string,
) {
  if (!(this instanceof StringAgg)) return new StringAgg(field, delimiter);
  SqlElement.call(this);
  this._field = typeof field === 'string' ? new Field(field) : field;
  this._delimiter = delimiter || ',';
} as StringAggCtor;

StringAgg.prototype = StringAggClass.prototype;
StringAgg.prototype.constructor = StringAgg;

export interface StringAgg extends StringAggClass {}
