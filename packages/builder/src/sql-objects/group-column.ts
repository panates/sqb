import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { BaseField } from './base-field.js';

const GROUP_COLUMN_PATTERN = /^((?:[a-zA-Z][\w$]*\.){0,2})([\w$]*)$/;

export class GroupColumn extends BaseField {
  constructor(value: string) {
    super();
    const m = value.match(GROUP_COLUMN_PATTERN);
    if (!m)
      throw new TypeError(`"${value}" does not match group column format`);
    this._field = m[2];
    if (m[1]) {
      const a = m[1].split(/\./g);
      a.pop();
      this._table = a.pop();
      this._schema = a.pop();
    }
  }

  get _type(): SerializationType {
    return SerializationType.GROUP_COLUMN;
  }

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
