import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { BaseField } from './base-field.js';

const ORDER_COLUMN_PATTERN =
  /^([-+])?((?:[a-zA-Z_][\w$]*\.){0,2})([a-zA-Z_][\w$]*|\*) *(asc|dsc|desc|ascending|descending)?$/i;

export class OrderColumn extends BaseField {
  _descending?: boolean;

  constructor(value: string) {
    super();
    const m = value.match(ORDER_COLUMN_PATTERN);
    if (!m)
      throw new TypeError(`"${value}" does not match order column format`);
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
  }

  get _type(): SerializationType {
    return SerializationType.ORDER_COLUMN;
  }

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
