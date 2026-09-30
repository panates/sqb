import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * A `[schema.]table [alias]` table reference, used in `FROM`/`JOIN` clauses
 * and as an `INSERT`/`UPDATE`/`DELETE` target. Construct via the exported
 * {@link TableName} factory rather than this class directly.
 */
class TableNameClass extends SqlElement {
  /** The schema name, if the reference was qualified with one. */
  schema?: string;
  /** The bare table name. */
  table?: string;
  /** The table's alias, if any. */
  alias?: string;
  /** Optimizer hints to render alongside the table name (dialect-specific; a plain serializer emits none). */
  optimizerHint?: TableName.OptimizerHint[];

  get _type(): SerializationType {
    return SerializationType.TABLE_NAME;
  }

  /** Serializes as `[schema.]table [alias]`. */
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

interface TableNameCtor {
  new (tableName: string | TableName.Args): TableName;
  (tableName: string | TableName.Args): TableName;
  prototype: TableName;
}

/**
 * Creates a table reference. Callable with or without `new`.
 *
 * @param tableName - Either a `[schema.]table [as alias]` string, or a {@link TableName.Args} object.
 * @throws {TypeError} If the string form doesn't match the expected table name format.
 */
export const TableName = function (
  this: TableName,
  tableName: string | TableName.Args,
) {
  if (!(this instanceof TableName)) return new TableName(tableName);
  SqlElement.call(this);
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
} as TableNameCtor;

TableName.prototype = TableNameClass.prototype;
TableName.prototype.constructor = TableName;

export interface TableName extends TableNameClass {}

export namespace TableName {
  /** A single dialect-specific optimizer hint attached to a table reference. */
  export interface OptimizerHint {
    /** The hint text. */
    hint: string;
    /** Restricts the hint to these dialects; omitted means all dialects. */
    dialect?: string[];
  }

  /** Structured form of the arguments accepted by the {@link TableName} factory. */
  export interface Args {
    /** The schema name, if qualified. */
    schema?: string;
    /** The bare table name. */
    table: string;
    /** The table's alias, if any. */
    alias?: string;
    /** Optimizer hint(s); a bare string/string-array is wrapped into `{ hint }` with no dialect restriction. */
    optimizerHint?: string | string[] | OptimizerHint | OptimizerHint[];
  }
}
