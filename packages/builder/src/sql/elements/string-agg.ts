import { SerializationType } from '../../enums.js';
import { printArray } from '../../helpers.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Field } from './field.js';
import { OrderColumn } from './order-column.js';

class StringAggClass extends Serializable {
  _field!: Serializable;
  _delimiter!: string;
  _orderBy?: (OrderColumn | Serializable)[];
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.STRINGAGG_STATEMENT;
  }

  delimiter(value: string): this {
    this._delimiter = value;
    return this;
  }

  /**
   * Defines "order by" part of StringAGG.
   */
  orderBy(...field: (string | Serializable)[]): this {
    this._orderBy = this._orderBy || [];
    for (const arg of field) {
      if (!arg) continue;
      this._orderBy.push(typeof arg === 'string' ? OrderColumn(arg) : arg);
    }
    return this;
  }

  /**
   * Sets alias to case expression.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Performs serialization
   *
   * @param {Object} ctx
   * @return {string}
   * @override
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
  new (field: string | Serializable, delimiter?: string): StringAgg;
  (field: string | Serializable, delimiter?: string): StringAgg;
  prototype: StringAgg;
}

export const StringAgg = function (
  this: StringAgg,
  field: string | Serializable,
  delimiter?: string,
) {
  if (!(this instanceof StringAgg)) return new StringAgg(field, delimiter);
  Serializable.call(this);
  this._field = typeof field === 'string' ? new Field(field) : field;
  this._delimiter = delimiter || ',';
} as StringAggCtor;

StringAgg.prototype = StringAggClass.prototype;
StringAgg.prototype.constructor = StringAgg;

export interface StringAgg extends StringAggClass {}
