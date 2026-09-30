import { SerializationType } from '../../enums.js';
import { SerializeContext } from '../../serialize-context.js';
import { BaseField } from './base-field.js';

const GROUP_COLUMN_PATTERN = /^((?:[a-zA-Z][\w$]*\.){0,2})([\w$]*)$/;

/**
 * A `[schema.][table.]field` column reference used in a `GROUP BY` clause.
 * Construct via the exported {@link GroupColumn} factory rather than this
 * class directly.
 */
class GroupColumnClass extends BaseField {
  get _type(): SerializationType {
    return SerializationType.GROUP_COLUMN;
  }

  /** Serializes as `[schema.][table.]field`, escaping the field name if it's a reserved word. */
  _serialize(ctx: SerializeContext): string {
    const o = {
      schema: this._schema,
      table: this._table,
      field: this._field,
      isReservedWord: !!(this._field && ctx.isReservedWord(this._field)),
    };
    return ctx.serialize(
      this._type,
      o,
      () =>
        (this._schema ? this._schema + '.' : '') +
        (this._table ? this._table + '.' : '') +
        (o.isReservedWord ? '"' + this._field + '"' : this._field),
    );
  }
}

interface GroupColumnCtor {
  new (value: string): GroupColumn;
  (value: string): GroupColumn;
  prototype: GroupColumn;
}

/**
 * Creates a `GROUP BY` column reference. Callable with or without `new`.
 *
 * @param value - A `[schema.][table.]field` string.
 * @throws {TypeError} If `value` doesn't match the expected column format.
 */
export const GroupColumn = function (this: GroupColumn, value: string) {
  if (!(this instanceof GroupColumn)) return new GroupColumn(value);
  BaseField.call(this);
  const m = value.match(GROUP_COLUMN_PATTERN);
  if (!m) throw new TypeError(`"${value}" does not match group column format`);
  this._field = m[2];
  if (m[1]) {
    const a = m[1].split(/\./g);
    a.pop();
    this._table = a.pop();
    this._schema = a.pop();
  }
} as GroupColumnCtor;

GroupColumn.prototype = GroupColumnClass.prototype;
GroupColumn.prototype.constructor = GroupColumn;

export interface GroupColumn extends GroupColumnClass {}
