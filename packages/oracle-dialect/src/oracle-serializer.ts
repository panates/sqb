import {
  type DefaultSerializeFunction,
  isParam,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';
import { toDateString } from 'valgen';

/**
 * Oracle reserved words (Oracle Database SQL Language Reference, "Oracle
 * SQL Reserved Words") that are not already covered by
 * {@link SerializeContext}'s base reserved-words list.
 */
const reservedWords = new Set([
  'comment',
  'dual',
  'access',
  'any',
  'audit',
  'char',
  'cluster',
  'column_value',
  'compress',
  'connect',
  'current',
  'date',
  'decimal',
  'exclusive',
  'exists',
  'file',
  'float',
  'grant',
  'identified',
  'immediate',
  'increment',
  'initial',
  'integer',
  'intersect',
  'level',
  'lock',
  'long',
  'maxextents',
  'minus',
  'mlslabel',
  'mode',
  'modify',
  'nested_table_id',
  'noaudit',
  'nocompress',
  'nowait',
  'number',
  'of',
  'offline',
  'online',
  'option',
  'pctfree',
  'prior',
  'public',
  'raw',
  'rename',
  'resource',
  'revoke',
  'row',
  'rowid',
  'rownum',
  'rows',
  'session',
  'set',
  'share',
  'size',
  'smallint',
  'start',
  'successful',
  'synonym',
  'sysdate',
  'trigger',
  'uid',
  'validate',
  'values',
  'varchar',
  'varchar2',
  'view',
  'whenever',
]);

/**
 * `@sqb/builder` {@link SerializerExtension} for Oracle Database, handling
 * the Oracle-specific quirks the base serializer can't cover: `/*+ ... *\/`
 * optimizer hints, version-dependent pagination (native `OFFSET`/`FETCH`
 * on 12c+, a `ROWNUM`-based rewrite on older versions), a `FROM`-less
 * `SELECT` needing `FROM dual`, date/timestamp string and `Date` literals
 * rendered through `TO_DATE`/`TO_TIMESTAMP_TZ` (with a `TO_DATE`-over-
 * `TO_TIMESTAMP` bind-parameter rewrite for query performance), boolean-
 * as-number literals, array-valued equality/inequality parameters
 * rewritten as `IN`/`NOT IN`, `= NULL`/`<> NULL` rewritten as `IS`/`IS NOT
 * NULL`, and `LISTAGG`/sequence-getter syntax for @sqb/builder's portable
 * string-aggregation and sequence-value SQL elements.
 */
export class OracleSerializer implements SerializerExtension {
  dialect = 'oracle';
  reservedWords = reservedWords;

  /** Case-insensitive check against Oracle's {@link reservedWords} list. */
  isReservedWord(_: any, s: any) {
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
      case SerializationType.SELECT_QUERY_FROM:
        return this._serializeFrom(ctx, o, defFn);
      case SerializationType.COMPARISON_EXPRESSION:
        return this._serializeComparison(ctx, o, defFn);
      case SerializationType.STRING_VALUE:
        return this._serializeStringValue(ctx, o, defFn);
      case SerializationType.DATE_VALUE:
        return this._serializeDateValue(ctx, o, defFn);
      case SerializationType.BOOLEAN_VALUE:
        return this._serializeBooleanValue(ctx, o);
      case SerializationType.RETURNING_BLOCK:
        return this._serializeReturning();
      case SerializationType.STRINGAGG_STATEMENT:
        return this._serializeStringAGG(ctx, o, defFn);
      case SerializationType.SEQUENCE_GETTER_STATEMENT:
        return this._serializeSequenceGetter(ctx, o, defFn);
      case SerializationType.EXTERNAL_PARAMETER:
        return this._serializeParameter(ctx, o, defFn);
      default:
        break;
    }
  }

  /**
   * Injects any `/*+ ... *\/` optimizer hints declared on the query's
   * table references, then appends pagination for a `limit`/`offset`:
   * on Oracle 12c and later, native `OFFSET ... ROWS FETCH NEXT ... ROWS
   * ONLY` / `FETCH FIRST ... ROWS ONLY`; on older versions (or when
   * `ctx.dialectVersion` isn't known), a `ROWNUM`-based subquery rewrite
   * instead, since those don't support the standard `OFFSET`/`FETCH`
   * syntax.
   */
  private _serializeSelect(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ) {
    if (o.query._tables) {
      let optimizerHint = '';
      for (const t of o.query._tables) {
        if (t._type === SerializationType.TABLE_NAME) {
          if (!t.optimizerHint?.length) continue;
          const s = t.optimizerHint?.map(x => x.hint).join('\n');
          optimizerHint +=
            '/*+ ' + s.replace(/:table/gi, t.alias || t.table) + ' */';
        }
      }
      o.optimizerHint = optimizerHint;
    }

    let out = defFn(ctx, o);
    const limit = o.limit || 0;
    const offset = Math.max(o.offset || 0, 0);

    if (limit || offset) {
      const majorVersion = ctx.dialectVersion
        ? parseInt(String(ctx.dialectVersion).split('.')[0], 10)
        : 0;
      if (majorVersion >= 12) {
        if (offset)
          out +=
            '\nOFFSET ' +
            offset +
            ' ROWS' +
            (limit ? ' FETCH NEXT ' + limit + ' ROWS ONLY' : '');
        else out += '\nFETCH FIRST ' + limit + ' ROWS ONLY';
      } else {
        if (offset || o.orderBy) {
          out =
            'select * from (\n\t' +
            'select /*+ first_rows(' +
            (limit || 100) +
            ') */ t.*, rownum row$number from (\n\t' +
            out +
            '\n\b' +
            ') t' +
            (limit ? ' where rownum <= ' + (limit + offset) : '') +
            '\n\b)';
          if (offset) out += ' where row$number >= ' + (offset + 1);
        } else {
          out = 'select * from (\n\t' + out + '\n\b) where rownum <= ' + limit;
        }
      }
    }
    return out;
  }

  /** Falls back to `FROM dual` when the query has no table references - Oracle, unlike most dialects, requires a `FROM` clause even for a table-less `SELECT`. */
  private _serializeFrom(
    ctx: SerializeContext,
    arr: any,
    defFn: DefaultSerializeFunction,
  ): string {
    return defFn(ctx, arr) || 'from dual';
  }

  /**
   * Rewrites two comparison shapes Oracle can't express directly:
   * - `= :param`/`<> :param` where the bound parameter turns out to hold
   *   an array is rewritten as `IN (...)`/`NOT IN (...)` (Oracle has no
   *   array binding, so an array-valued equality would otherwise
   *   serialize as a single, incorrect scalar comparison).
   * - `= null`/`<> null` (including an unbound `:param` that resolved to
   *   `null`) is rewritten as `IS NULL`/`IS NOT NULL`, since Oracle's
   *   `= NULL`/`<> NULL` never match rather than raising an error.
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

  /**
   * Renders a `'yyyy-mm-dd'` string literal through `TO_DATE` and a
   * `'yyyy-mm-ddThh:mm:ss...'` (ISO-8601-with-`T`) string literal through
   * `TO_TIMESTAMP_TZ`, since Oracle has no implicit string-to-date/
   * timestamp conversion matching either format by default. Any other
   * string falls through to the base serializer.
   */
  private _serializeStringValue(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (typeof o === 'string') {
      if (o.match(/^\d{4}-\d{2}-\d{2}$/))
        return `to_date('${o}', 'yyyy-mm-dd')`;
      if (o.match(/^\d{4}-\d{2}-\d{2}T/))
        return `to_timestamp_tz('${o}','yyyy-mm-dd"T"hh24:mi:sstzh:tzm')`;
    }
    return defFn(ctx, o);
  }

  /** Wraps a `Date` value's base-serialized literal in `TO_DATE`, using a date-only or date-and-time format mask depending on whether the serialized string carries a time component. */
  private _serializeDateValue(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    const s = defFn(ctx, o);
    return (
      s &&
      (s.length <= 12
        ? 'to_date(' + s + ", 'yyyy-mm-dd')"
        : 'to_date(' + s + ", 'yyyy-mm-dd hh24:mi:ss')")
    );
  }

  /** Oracle has no native boolean type: renders as the numeric literals `1`/`0` (or `null`). */
  private _serializeBooleanValue(_ctx: SerializeContext, o: any): string {
    return o == null ? 'null' : o ? '1' : '0';
  }

  /** Renders `@sqb/builder`'s portable string-aggregation element as Oracle's `LISTAGG(...) WITHIN GROUP (...)`. */
  // noinspection JSUnusedLocalSymbols
  private _serializeStringAGG(
    ctx: SerializeContext,
    o: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defFn: DefaultSerializeFunction,
  ): string {
    return (
      'listagg(' +
      o.field +
      ",'" +
      o.delimiter +
      "') within group (" +
      (o.orderBy ? o.orderBy : 'order by null') +
      ')' +
      (o.alias ? ' ' + o.alias : '')
    );
  }

  /** Renders `@sqb/builder`'s portable sequence-value element as Oracle's `SEQUENCE.NEXTVAL`/`SEQUENCE.CURRVAL` syntax. */
  // noinspection JSUnusedLocalSymbols
  private _serializeSequenceGetter(
    ctx: SerializeContext,
    o: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defFn: DefaultSerializeFunction,
  ): string {
    return (
      o.genName +
      '.' +
      (o.next ? 'nextval' : 'currval') +
      (o.alias ? ' ' + o.alias : '')
    );
  }

  /**
   * Suppresses the base serializer's `RETURNING` clause entirely. Oracle's
   * own `RETURNING ... INTO` needs out-bind variables that must be
   * declared and read at the connection layer, not composed as plain SQL
   * text, so it's produced there instead (see `@sqb/oracle`).
   */
  private _serializeReturning(): string {
    return '';
  }

  /**
   * Rewrites two parameter shapes Oracle needs special handling for (only
   * meaningful for a `SELECT`/`DELETE` query, where the bound value is
   * already known):
   * - A `Date`-valued parameter is rebound as a formatted string and
   *   wrapped in `TO_DATE(...)` rather than left for the driver's default
   *   `TO_TIMESTAMP`-based binding, since date-typed columns compared via
   *   `TO_TIMESTAMP` run substantially slower in Oracle - sub-second
   *   precision is deliberately dropped, which is fine for date/timestamp
   *   equality comparisons at this precision.
   * - An array-valued parameter is rewritten as an inline SQL list via
   *   {@link SerializeContext.anyToSQL} and removed from `ctx.params`,
   *   since Oracle has no array parameter binding.
   *
   * Any other parameter falls through to the base serializer's
   * placeholder.
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
      /* Queries involving date data types run very slowly when Oracle's TO_TIMESTAMP is used.
         To overcome this issue, TO_DATE should be used instead. Milliseconds can be disregarded. */
      if (v instanceof Date) {
        ctx.preparedParams = ctx.preparedParams || {};
        ctx.preparedParams[o.name] = toDateString(v, { trim: 'sec' }).replace(
          'T',
          ' ',
        );
        return `TO_DATE(:${o.name}, 'yyyy-mm-dd hh24:mi:ss')`;
      }
      if (Array.isArray(v)) {
        delete ctx.params?.[o.name];
        return ctx.anyToSQL(v);
      }
    }
    return defFn(ctx, o);
  }
}
