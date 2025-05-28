import { SerializationType } from '../enums.js';
import { SerializeContext } from '../serialize-context.js';
import { BaseField } from './base-field.js';

const RETURNING_COLUMN_PATTERN = /^([a-zA-Z_]\w*) *(?:as)? *(\w+)?$/;

export class ReturningColumn extends BaseField {
  _alias: string;

  constructor(field: string) {
    super();
    const m = field.match(RETURNING_COLUMN_PATTERN);
    if (!m)
      throw new TypeError(`"${field}" does not match returning column format`);
    this._field = m[1];
    this._alias = m[2];
  }

  get _type(): SerializationType {
    return SerializationType.RETURNING_COLUMN;
  }

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
