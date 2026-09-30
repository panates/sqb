import {
  type DefaultSerializeFunction,
  isParam,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

/**
 * MariaDB reserved words that must be quoted when used as a bare identifier.
 * MariaDB shares almost its entire reserved-word list with MySQL
 * (https://dev.mysql.com/doc/refman/8.0/en/keywords.html), so this list
 * mirrors @sqb/mysql-dialect's, plus a supplemental set of words MariaDB
 * reserves on top of that
 * (https://mariadb.com/kb/en/reserved-words/#mariadb-keywords-not-reserved-by-mysql).
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
  // MariaDB-only additions on top of the MySQL keyword set
  'current_role',
  'delete_domain_id',
  'do_domain_ids',
  'general',
  'ignore_domain_ids',
  'ignore_server_ids',
  'intersect',
  'master_heartbeat_period',
  'master_ssl_verify_server_cert',
  'offset',
  'page_checksum',
  'parse_vcol_expr',
  'position',
  'returning',
  'rownum',
  'slow',
  'stats_auto_recalc',
  'stats_persistent',
  'stats_sample_pages',
]);

/**
 * `@sqb/builder` dialect extension producing MariaDB-correct SQL:
 * `LIMIT`/`OFFSET` clause syntax, `IS`/`IS NOT`/`IN`/`NOT IN` rewriting for
 * `NULL`/array-valued comparisons, `0`/`1` boolean literals, `RETURNING`
 * emulation on `UPDATE` (unsupported natively), and the MariaDB reserved
 * word list. Registered automatically as a side effect of importing this
 * package - see `index.ts`.
 */
export class MariadbSerializer implements SerializerExtension {
  dialect = 'mariadb';
  reservedWords = reservedWords;

  /** Checks `s` (case-insensitively) against the MariaDB {@link reservedWords} list. */
  isReservedWord(_: any, s: any): boolean {
    return s && typeof s === 'string' && reservedWords.has(s.toLowerCase());
  }

  /** Dispatches each fragment type this extension overrides to its dedicated `_serialize*` method; everything else falls through to `@sqb/builder`'s default. */
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
      case SerializationType.EXTERNAL_PARAMETER:
        return this._serializeParameter(ctx, o, defFn);
      case SerializationType.RETURNING_BLOCK:
        return this._serializeReturning(ctx, o, defFn);
      default:
        return undefined;
    }
  }

  /**
   * Strips the `RETURNING` clause from an `UPDATE` (unsupported by
   * MariaDB), leaving `Insert`/`Delete`'s native support untouched - see
   * the inline comment for how the adapter is expected to compensate.
   */
  private _serializeReturning(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    // MariaDB (10.5+) natively supports RETURNING on INSERT and DELETE, but
    // NOT on UPDATE (verified against 11.8) - strip it there so the adapter
    // can emulate it with a follow-up SELECT, same as @sqb/mysql-dialect
    // does for every statement type.
    if (ctx.rootQuery._type === SerializationType.UPDATE_QUERY) return '';
    return defFn(ctx, o);
  }

  /**
   * Appends MariaDB's `LIMIT`/`OFFSET` clause syntax. An offset with no
   * limit needs a `LIMIT` anyway (MariaDB has no bare `OFFSET`), so it's
   * given the maximum representable `BIGINT UNSIGNED` value as a
   * practically-unlimited limit.
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
   * Rewrites a comparison whose right-hand side resolves to an array value
   * from `eq`/`ne` into `in`/`not in` (MariaDB's `=`/`!=` don't accept an
   * array operand), and a comparison against a `null` value from `eq`/`ne`
   * into `is`/`is not` (`= NULL` is never true in SQL, even for a `NULL`
   * value) - stripping the now-unused bind parameter in the latter case.
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

  /** Serializes a boolean as MariaDB's `1`/`0` literals (it has no native boolean type). */
  private _serializeBooleanValue(_ctx: SerializeContext, o: any): string {
    return o == null ? 'null' : o ? '1' : '0';
  }

  /**
   * Detects an ISO-8601 datetime string (as opposed to a plain
   * `'yyyy-mm-dd'` date, which MariaDB accepts as-is) and reformats it via
   * `dateToSQL` - see the inline comment for why.
   */
  private _serializeStringValue(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    // MariaDB accepts 'yyyy-mm-dd' literals as-is for DATE columns, but
    // datetime strings carrying a timezone offset (e.g. from JSON test
    // fixtures) must be normalized to 'yyyy-mm-dd hh:mm:ss' first.
    if (typeof o === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(o)) {
      const d = new Date(o);
      if (!isNaN(d.getTime())) return ctx.dateToSQL(d);
    }
    return defFn(ctx, o);
  }

  /**
   * In a `SELECT`/`DELETE` query, inlines an array-valued bind parameter as
   * a literal list instead of binding it (needed for it to work as the
   * operand of the `IN`/`NOT IN` rewrite in {@link _serializeComparison},
   * since a single bind parameter can't stand in for a variable-length SQL
   * list) - removing it from `ctx.params` since it's no longer bound.
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
