import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';

export class TableName extends Serializable {
  schema?: string;
  table?: string;
  alias?: string;

  constructor(tableName: string) {
    super();
    const m = tableName.match(
      /^(?:([a-zA-Z][\w$]*)\.)? *([a-zA-Z][\w$]*) *(?:as)? *(\w+)?$/,
    );
    if (!m)
      throw new TypeError(`(${tableName}) does not match table name format`);
    if (m[1]) this.schema = m[1];
    if (m[2]) this.table = m[2];
    if (m[3]) this.alias = m[3];
  }

  get _type(): SerializationType {
    return SerializationType.TABLE_NAME;
  }

  _serialize(ctx: SerializeContext): string {
    return ctx.serialize(
      this._type,
      {
        schema: this.schema,
        table: this.table,
        alias: this.alias,
      },
      () =>
        (this.schema ? this.schema + '.' : '') +
        this.table +
        (this.alias ? ' ' + this.alias : ''),
    );
  }
}
