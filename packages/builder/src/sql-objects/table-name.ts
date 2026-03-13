import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';

export interface OptimizerHintArgs {
  hint: string;
  dialect?: string[];
}

export interface TableNameArgs {
  schema?: string;
  table: string;
  alias?: string;
  optimizerHint?: string | string[] | OptimizerHintArgs | OptimizerHintArgs[];
}

export class TableName extends Serializable {
  schema?: string;
  table?: string;
  alias?: string;
  optimizerHint?: OptimizerHintArgs[];

  constructor(tableName: string | TableNameArgs) {
    super();
    if (typeof tableName === 'string') {
      const m = tableName.match(
        /^(?:([a-zA-Z][\w$]*)\.)? *([a-zA-Z][\w$]*) *(?:as)? *(\w+)?$/,
      );
      if (!m)
        throw new TypeError(`(${tableName}) does not match table name format`);
      if (m[1]) this.schema = m[1];
      if (m[2]) this.table = m[2];
      if (m[3]) this.alias = m[3];
    } else {
      this.schema = tableName.schema;
      this.table = tableName.table;
      this.alias = tableName.alias;
      if (tableName.optimizerHint) {
        const arg0 = tableName.optimizerHint;
        this.optimizerHint = [];
        if (typeof arg0 === 'object' && !Array.isArray(arg0)) {
          this.optimizerHint.push({
            hint: String(arg0.hint),
            dialect: Array.isArray(arg0.dialect) ? arg0.dialect : undefined,
          });
        } else {
          this.optimizerHint.push({
            hint: String(arg0),
          });
        }
      }
    }
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
        optimizerHint: this.optimizerHint,
      },
      () =>
        (this.schema ? this.schema + '.' : '') +
        this.table +
        (this.alias ? ' ' + this.alias : ''),
    );
  }
}
