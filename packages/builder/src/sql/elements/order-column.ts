import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { BaseField } from './base-field.js';

const ORDER_COLUMN_PATTERN =
  /^([-+])?((?:[a-zA-Z_][\w$]*\.){0,2})([a-zA-Z_][\w$]*|\*) *(asc|dsc|desc|ascending|descending)?$/i;

/**
 * A `[schema.][table.]field [desc]` column reference used in an
 * `ORDER BY` clause. Construct via the exported {@link OrderColumn} factory
 * rather than this class directly.
 */
class OrderColumnClass extends BaseField {
  declare _descending?: boolean;

  get _type(): SerializationType {
    return SerializationType.ORDER_COLUMN;
  }

  /** Serializes as `[schema.][table.]field [desc]`, escaping the field name if it's a reserved word. */
  _serialize(ctx: SerializeContext): string {
    const o = {
      schema: this._schema,
      table: this._table,
      field: this._field,
      descending: !!this._descending,
      isReservedWord: !!(this._field && ctx.isReservedWord(this._field)),
    };
    return ctx.serialize(
      this._type,
      o,
      () =>
        (o.schema ? o.schema + '.' : '') +
        (o.table ? o.table + '.' : '') +
        (o.isReservedWord ? '"' + o.field + '"' : o.field) +
        (o.descending ? ' desc' : ''),
    );
  }
}

interface OrderColumnCtor {
  new (value: string): OrderColumn;
  (value: string): OrderColumn;
  prototype: OrderColumn;
}

/**
 * Creates an `ORDER BY` column reference. Callable with or without `new`.
 *
 * @param value - A `[-|+][schema.][table.]field [asc|desc|dsc|ascending|descending]` string. A leading `-` (or a `desc`/`dsc`/`descending` suffix) sorts descending.
 * @throws {TypeError} If `value` doesn't match the expected column format.
 */
export const OrderColumn = function (this: OrderColumn, value: string) {
  if (!(this instanceof OrderColumn)) return new OrderColumn(value);
  SqlElement.call(this);
  const m = value.match(ORDER_COLUMN_PATTERN);
  if (!m) throw new TypeError(`"${value}" does not match order column format`);
  this._field = m[3];
  if (m[2]) {
    const a = m[2].split(/\./g);
    a.pop();
    this._table = a.pop();
    this._schema = a.pop();
  }
  this._descending = !!(
    m[1] === '-' ||
    (!m[1] &&
      m[4] &&
      ['dsc', 'desc', 'descending'].includes(m[4].toLowerCase()))
  );
} as OrderColumnCtor;

OrderColumn.prototype = OrderColumnClass.prototype;
OrderColumn.prototype.constructor = OrderColumn;

export interface OrderColumn extends OrderColumnClass {}
