import {
  type DefaultSerializeFunction,
  isParam,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

/**
 * MySQL reserved words (https://dev.mysql.com/doc/refman/8.0/en/keywords.html)
 * that are not already covered by {@link SerializeContext}'s base
 * reserved-words list.
 */
const reservedWords = new Set([
  'accessible',
  'analyze',
  'asensitive',
  'before',
  'bigint',
  'binary',
  'blob',
  'both',
  'call',
  'change',
  'char',
  'character',
  'collate',
  'condition',
  'continue',
  'convert',
  'cross',
  'cume_dist',
  'current_date',
  'current_time',
  'current_timestamp',
  'current_user',
  'cursor',
  'database',
  'databases',
  'day_hour',
  'day_microsecond',
  'day_minute',
  'day_second',
  'dec',
  'decimal',
  'declare',
  'delayed',
  'dense_rank',
  'describe',
  'deterministic',
  'distinctrow',
  'div',
  'double',
  'dual',
  'each',
  'elseif',
  'empty',
  'enclosed',
  'escaped',
  'except',
  'exists',
  'exit',
  'explain',
  'false',
  'fetch',
  'first_value',
  'float',
  'float4',
  'float8',
  'force',
  'fulltext',
  'generated',
  'get',
  'grant',
  'grouping',
  'groups',
  'high_priority',
  'hour_microsecond',
  'hour_minute',
  'hour_second',
  'if',
  'ignore',
  'infile',
  'inout',
  'insensitive',
  'int',
  'int1',
  'int2',
  'int3',
  'int4',
  'int8',
  'integer',
  'interval',
  'iterate',
  'json_table',
  'keys',
  'kill',
  'lag',
  'last_value',
  'lateral',
  'lead',
  'leading',
  'leave',
  'limit',
  'linear',
  'lines',
  'load',
  'localtime',
  'localtimestamp',
  'lock',
  'long',
  'longblob',
  'longtext',
  'loop',
  'low_priority',
  'master_bind',
  'match',
  'maxvalue',
  'mediumblob',
  'mediumint',
  'mediumtext',
  'middleint',
  'minute_microsecond',
  'minute_second',
  'mod',
  'modifies',
  'natural',
  'no_write_to_binlog',
  'nth_value',
  'ntile',
  'numeric',
  'of',
  'optimize',
  'optimizer_costs',
  'option',
  'optionally',
  'out',
  'outfile',
  'over',
  'partition',
  'percent_rank',
  'precision',
  'procedure',
  'purge',
  'range',
  'rank',
  'read',
  'reads',
  'read_write',
  'real',
  'recursive',
  'regexp',
  'release',
  'rename',
  'repeat',
  'replace',
  'require',
  'resignal',
  'restrict',
  'return',
  'revoke',
  'rlike',
  'row',
  'row_number',
  'rows',
  'schemas',
  'second_microsecond',
  'sensitive',
  'separator',
  'set',
  'show',
  'signal',
  'smallint',
  'spatial',
  'specific',
  'sql',
  'sqlexception',
  'sqlstate',
  'sqlwarning',
  'sql_big_result',
  'sql_calc_found_rows',
  'sql_small_result',
  'ssl',
  'starting',
  'stored',
  'straight_join',
  'system',
  'terminated',
  'tinyblob',
  'tinyint',
  'tinytext',
  'trailing',
  'trigger',
  'true',
  'undo',
  'unlock',
  'unsigned',
  'usage',
  'use',
  'using',
  'utc_date',
  'utc_time',
  'utc_timestamp',
  'values',
  'varbinary',
  'varchar',
  'varcharacter',
  'varying',
  'virtual',
  'while',
  'window',
  'write',
  'xor',
  'year_month',
  'zerofill',
]);

/**
 * `@sqb/builder` {@link SerializerExtension} for MySQL, handling the
 * MySQL-specific quirks the base serializer can't cover: `LIMIT`/`OFFSET`
 * pagination (including MySQL's "max unsigned bigint" `LIMIT` trick for an
 * offset-only query), boolean-as-integer literals, array-valued
 * equality/inequality parameters rewritten as `IN`/`NOT IN`, `= NULL`/`<>
 * NULL` rewritten as `IS`/`IS NOT NULL`, and ISO-8601 datetime string
 * literals normalized before being sent as-is.
 */
export class MysqlSerializer implements SerializerExtension {
  dialect = 'mysql';
  reservedWords = reservedWords;

  /** Case-insensitive check against MySQL's {@link reservedWords} list. */
  isReservedWord(_: any, s: any): boolean {
    return s && typeof s === 'string' && reservedWords.has(s.toLowerCase());
  }

  /** Dispatches to the dialect-specific serializer for each SQL element type this extension overrides, falling through to `defFn` (the base serializer) for everything else. */
  serialize(
    ctx: SerializeContext,
    type: SerializationType | string,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string | undefined {
    switch (type as any) {
      case SerializationType.SELECT_QUERY:
        return this._serializeSelect(ctx, o, defFn);
      case SerializationType.COMPARISON_EXPRESSION:
        return this._serializeComparison(ctx, o, defFn);
      case SerializationType.BOOLEAN_VALUE:
        return this._serializeBooleanValue(ctx, o);
      case SerializationType.STRING_VALUE:
        return this._serializeStringValue(ctx, o, defFn);
      case SerializationType.RETURNING_BLOCK:
        return this._serializeReturning();
      case SerializationType.EXTERNAL_PARAMETER:
        return this._serializeParameter(ctx, o, defFn);
      default:
        return undefined;
    }
  }

  /**
   * Appends MySQL's `LIMIT`/`OFFSET` pagination clause when the query has a
   * `limit`/`offset`. MySQL has no bare `OFFSET` without a `LIMIT`, so an
   * offset-only query is given the maximum unsigned `BIGINT` value
   * (`18446744073709551615`) as its `LIMIT` - the documented MySQL idiom
   * for "no real limit".
   */
  private _serializeSelect(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    let out = defFn(ctx, o);
    const limit = o.limit || 0;
    const offset = Math.max(o.offset || 0, 0);
    if (limit) out += '\nLIMIT ' + limit;
    if (offset)
      out +=
        (!limit ? '\nLIMIT 18446744073709551615 ' : ' ') + 'OFFSET ' + offset;
    return out;
  }

  /**
   * Rewrites two comparison shapes MySQL can't express directly:
   * - `= :param`/`<> :param` where the bound parameter turns out to hold
   *   an array is rewritten as `IN (...)`/`NOT IN (...)` (MySQL has no
   *   array binding, so an array-valued equality would otherwise
   *   serialize as a single, incorrect scalar comparison).
   * - `= null`/`<> null` (including an unbound `:param` that resolved to
   *   `null`) is rewritten as `IS NULL`/`IS NOT NULL`, since MySQL's
   *   `= NULL`/`<> NULL` never match (per SQL's three-valued-logic
   *   semantics for `NULL`) rather than raising an error.
   */
  private _serializeComparison(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (isParam(o.orgRight)) {
      const n = o.orgRight._name;
      const v = ctx.orgParams?.[n];
      if (Array.isArray(v)) {
        o.right.isParam = false;
        if (o.operatorType === 'eq')
          return defFn(ctx, {
            ...o,
            operatorType: OperatorType.in,
            symbol: 'in',
          });
        if (o.operatorType === 'ne')
          return defFn(ctx, {
            ...o,
            operatorType: OperatorType.notIn,
            symbol: 'not in',
          });
      }
    }

    if (
      (o.right?.expression && o.right?.expression === 'null') ||
      (o.right &&
        o.right?.value == null &&
        (!o.right.expression || o.right.expression.startsWith(':')))
    ) {
      if (o.right.expression?.startsWith(':')) {
        const s = o.right.expression.substring(1);
        if (ctx.params) delete ctx.params[s];
        if (ctx.preparedParams) delete ctx.preparedParams[s];
        if (ctx.paramOptions) delete ctx.paramOptions[s];
        o.right.expression = 'null';
        o.right.isParam = false;
      }
      if (o.operatorType === 'eq')
        return defFn(ctx, {
          ...o,
          operatorType: OperatorType.is,
          symbol: 'is',
        });
      if (o.operatorType === 'ne')
        return defFn(ctx, {
          ...o,
          operatorType: OperatorType.isNot,
          symbol: 'is not',
        });
    }
    return defFn(ctx, o);
  }

  /** MySQL has no native boolean type: renders as the integer literals `1`/`0` (or `null`). */
  private _serializeBooleanValue(_ctx: SerializeContext, o: any): string {
    return o == null ? 'null' : o ? '1' : '0';
  }

  /**
   * Normalizes an ISO-8601 string carrying a `T` date/time separator (e.g.
   * from JSON test fixtures) into MySQL's `'yyyy-mm-dd hh:mm:ss'` literal
   * via {@link SerializeContext.dateToSQL}. A plain `'yyyy-mm-dd'` date
   * string (no `T`) is accepted by MySQL as-is and falls through to the
   * base serializer, as does any other string.
   */
  private _serializeStringValue(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (typeof o === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(o)) {
      const d = new Date(o);
      if (!isNaN(d.getTime())) return ctx.dateToSQL(d);
    }
    return defFn(ctx, o);
  }

  /**
   * Suppresses the base serializer's `RETURNING` clause entirely. MySQL
   * has no `RETURNING` support at all, so any inserted/deleted rows must
   * instead be read back at the connection layer (see `@sqb/mysql`).
   */
  private _serializeReturning(): string {
    return '';
  }

  /**
   * Rewrites a parameter reference bound to an array (only meaningful for
   * a `SELECT`/`DELETE` query) into an inline SQL list via
   * {@link SerializeContext.anyToSQL}, since MySQL has no array parameter
   * binding; the parameter is then removed from `ctx.params` so it isn't
   * also sent as a bind value. Any other parameter falls through to the
   * base serializer's placeholder.
   */
  private _serializeParameter(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (
      ctx.rootQuery._type === SerializationType.SELECT_QUERY ||
      ctx.rootQuery._type === SerializationType.DELETE_QUERY
    ) {
      const v = ctx.params?.[o.name];
      if (Array.isArray(v)) {
        delete ctx.params?.[o.name];
        return ctx.anyToSQL(v);
      }
    }
    return defFn(ctx, o);
  }
}
