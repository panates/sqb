import { DataType, SerializationType } from '../../enums.js';
import { SerializeContext } from '../../serialize-context.js';
import { BaseField } from './base-field.js';

// No space is allowed between the schema/table prefix and the field name,
// and the alias segment's leading whitespace is mandatory (not `*`), so
// the engine can't backtrack over the ambiguous split points a run of
// plain word characters (or spaces) would otherwise create between the
// adjacent groups - that ambiguity is what made the previous version of
// this regex vulnerable to polynomial-time backtracking (ReDoS) on
// adversarial input.
const TABLE_COLUMN_PATTERN =
  /^ *((?:[a-zA-Z_][\w$_]*\.){0,2})([0-9a-zA-Z_][\w$_]*|\*)(?: +(?:as +)?([a-zA-Z_][\w$_]*))? *$/;

/**
 * A `[schema.][table.]field [as alias]` column reference, used as a
 * `SELECT` column. Construct via the exported {@link Field} factory rather
 * than this class directly.
 */
class FieldClass extends BaseField {
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.FIELD_NAME;
  }

  /** Serializes this field, escaping the bare field name if it's a reserved word and appending the alias, if any. */
  _serialize(ctx: SerializeContext): string {
    const o = {
      schema: this._schema,
      table: this._table,
      field: this._field,
      alias: this._alias,
      isReservedWord: !!(this._field && ctx.isReservedWord(this._field)),
    };
    return ctx.serialize(this._type, o, () => {
      let out =
        (this._schema ? this._schema + '.' : '') +
        (this._table ? this._table + '.' : '') +
        this._field;
      if (!out.includes('.')) out = ctx.escapeReserved(out);
      return (
        out + (this._alias ? ' as ' + ctx.escapeReserved(this._alias) : '')
      );
    });
  }
}

interface FieldCtor {
  new (expression: string, dataType?: DataType, isArray?: boolean): Field;
  new (args: {
    expression: string;
    dataType?: DataType;
    isArray?: boolean;
  }): Field;
  (expression: string, dataType?: DataType, isArray?: boolean): Field;
  (args: { expression: string; dataType?: DataType; isArray?: boolean }): Field;
  prototype: Field;
}

/**
 * Creates a column reference. Callable with or without `new`.
 *
 * @param arg0 - Either an `expression` string in `[schema.][table.]field [as alias]` form (`*` allowed for the field), or an `{ expression, dataType?, isArray? }` object.
 * @param arg1 - The column's portable data type (only used with the string-expression overload).
 * @param arg2 - Whether the column value is an array (only used with the string-expression overload).
 * @throws {TypeError} If the expression doesn't match the expected column format.
 */
export const Field = function (this: Field, arg0: any, arg1?: any, arg2?: any) {
  if (!(this instanceof Field)) return new Field(arg0, arg1, arg2);
  BaseField.call(this);
  let expression: string;
  if (typeof arg0 === 'object') {
    expression = arg0.expression;
    this._dataType = arg0.dataType;
    this._isArray = arg0.isArray;
  } else {
    expression = arg0;
    this._dataType = arg1;
    this._isArray = arg2;
  }
  const m = expression?.match(TABLE_COLUMN_PATTERN);
  if (!m)
    throw new TypeError(`"${expression}" does not match table column format`);
  this._field = m[2]?.trim();
  if (m[1]) {
    const a = m[1].split(/\./g);
    a.pop();
    this._table = a.pop()?.trim();
    this._schema = a.pop()?.trim();
  }
  this._alias = this._field !== '*' ? m[3]?.trim() : '';
} as FieldCtor;

Field.prototype = FieldClass.prototype;
Field.prototype.constructor = Field;

export interface Field extends FieldClass {}
