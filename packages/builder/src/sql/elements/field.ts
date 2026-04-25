import { DataType, SerializationType } from '../../enums.js';
import { SerializeContext } from '../../serialize-context.js';
import { BaseField } from './base-field.js';

const TABLE_COLUMN_PATTERN =
  /^ *((?:[a-zA-Z_][\w$_]*\.){0,2}) *([0-9a-zA-Z_][\w$_]*|\*) *(?:as)? *([a-zA-Z_][\w$_]*)?$/;

class FieldClass extends BaseField {
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.FIELD_NAME;
  }

  _serialize(ctx: SerializeContext): string {
    const o = {
      schema: this._schema,
      table: this._table,
      field: this._field,
      alias: this._alias,
      isReservedWord: !!(this._field && ctx.isReservedWord(this._field)),
    };
    return ctx.serialize(this._type, o, () => {
      const prefix =
        ctx.escapeReserved(this._schema ? this._schema + '.' : '') +
        (this._table ? this._table + '.' : '');
      return (
        prefix +
        (!prefix && o.isReservedWord ? '"' + this._field + '"' : this._field) +
        (this._alias ? ' as ' + this._alias : '')
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
