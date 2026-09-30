import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { BaseField } from './base-field.js';

const RETURNING_COLUMN_PATTERN = /^([a-zA-Z_]\w*) *(?:as)? *(\w+)?$/;

/**
 * A `field [as alias]` column reference used in a `RETURNING` clause.
 * Construct via the exported {@link ReturningColumn} factory rather than
 * this class directly.
 */
class ReturningColumnClass extends BaseField {
  _alias!: string;

  get _type(): SerializationType {
    return SerializationType.RETURNING_COLUMN;
  }

  /**
   * Serializes as `field [as alias]`, escaping the field name if it's a
   * reserved word, and records this column onto `ctx.returningFields`.
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      field: this._field,
      alias: this._alias,
    };
    ctx.returningFields = ctx.returningFields || [];
    ctx.returningFields.push(o);
    return ctx.serialize(
      this._type,
      o,
      () =>
        ctx.escapeReserved(o.field) +
        (o.alias ? ' as ' + ctx.escapeReserved(o.alias) : ''),
    );
  }
}

interface ReturningColumnCtor {
  new (field: string): ReturningColumn;
  (field: string): ReturningColumn;
  prototype: ReturningColumn;
}

/**
 * Creates a `RETURNING` column reference. Callable with or without `new`.
 *
 * @param field - A `field [as alias]` string.
 * @throws {TypeError} If `field` doesn't match the expected column format.
 */
export const ReturningColumn = function (this: ReturningColumn, field: string) {
  if (!(this instanceof ReturningColumn)) return new ReturningColumn(field);
  SqlElement.call(this);
  const m = field.match(RETURNING_COLUMN_PATTERN);
  if (!m)
    throw new TypeError(`"${field}" does not match returning column format`);
  this._field = m[1];
  this._alias = m[2];
} as ReturningColumnCtor;

ReturningColumn.prototype = ReturningColumnClass.prototype;
ReturningColumn.prototype.constructor = ReturningColumn;

export interface ReturningColumn extends ReturningColumnClass {}
