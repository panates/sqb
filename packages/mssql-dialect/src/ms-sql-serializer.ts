import {
  type DefaultSerializeFunction,
  isParam,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

/**
 * T-SQL reserved keywords (Reserved Keywords (Transact-SQL),
 * learn.microsoft.com) that are not already covered by
 * {@link SerializeContext}'s base reserved-words list.
 */
const reservedWords = new Set([
  'any',
  'backup',
  'begin',
  'break',
  'browse',
  'bulk',
  'checkpoint',
  'close',
  'clustered',
  'coalesce',
  'collate',
  'comment',
  'commit',
  'compute',
  'contains',
  'containstable',
  'continue',
  'convert',
  'cross',
  'current',
  'current_date',
  'current_time',
  'current_timestamp',
  'current_user',
  'cursor',
  'database',
  'dbcc',
  'deallocate',
  'declare',
  'deny',
  'disk',
  'distributed',
  'double',
  'dump',
  'errlvl',
  'escape',
  'except',
  'exec',
  'execute',
  'exists',
  'exit',
  'external',
  'fetch',
  'file',
  'fillfactor',
  'freetext',
  'freetexttable',
  'function',
  'goto',
  'grant',
  'holdlock',
  'identity',
  'identity_insert',
  'identitycol',
  'if',
  'intersect',
  'kill',
  'lineno',
  'load',
  'national',
  'nocheck',
  'nonclustered',
  'nullif',
  'of',
  'off',
  'offsets',
  'open',
  'opendatasource',
  'openquery',
  'openrowset',
  'openxml',
  'option',
  'over',
  'percent',
  'pivot',
  'plan',
  'precision',
  'print',
  'proc',
  'procedure',
  'public',
  'raiserror',
  'read',
  'readtext',
  'reconfigure',
  'replication',
  'restore',
  'restrict',
  'return',
  'revert',
  'revoke',
  'rollback',
  'rowcount',
  'rowguidcol',
  'rule',
  'save',
  'securityaudit',
  'semantickeyphrasetable',
  'semanticsimilaritydetailstable',
  'semanticsimilaritytable',
  'session_user',
  'set',
  'setuser',
  'shutdown',
  'some',
  'statistics',
  'system_user',
  'tablesample',
  'textsize',
  'top',
  'tran',
  'transaction',
  'trigger',
  'truncate',
  'try_convert',
  'tsequal',
  'unpivot',
  'updatetext',
  'use',
  'values',
  'varying',
  'view',
  'waitfor',
  'while',
  'writetext',
]);

/**
 * `@sqb/builder` {@link SerializerExtension} for Microsoft SQL Server,
 * handling the T-SQL-specific quirks the base serializer can't cover:
 * `OFFSET`/`FETCH` pagination, boolean-as-bit literals, array-valued
 * equality/inequality parameters rewritten as `IN`/`NOT IN`, `= NULL`/`<>
 * NULL` rewritten as `IS`/`IS NOT NULL`, and ISO-8601 string literals
 * normalized before T-SQL's implicit datetime conversion sees them.
 * Registered automatically as a side effect of importing this package -
 * see `index.ts`.
 */
export class MSSqlSerializer implements SerializerExtension {
  dialect = 'mssql';
  reservedWords = reservedWords;

  /** Case-insensitive check against T-SQL's {@link reservedWords} list. */
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
        break;
    }
  }

  /**
   * Appends T-SQL's `OFFSET ... ROWS FETCH NEXT ... ROWS ONLY` pagination
   * clause when the query has a `limit`/`offset`. `OFFSET`/`FETCH` is only
   * valid when preceded by an `ORDER BY`, so a no-op `ORDER BY (SELECT
   * NULL)` is injected when the query doesn't already have one.
   */
  private _serializeSelect(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    let out = defFn(ctx, o);
    const limit = o.limit || 0;
    const offset = Math.max(o.offset || 0, 0);
    if (limit || offset) {
      if (!o.orderBy) out += '\nORDER BY (SELECT NULL)';
      out += '\nOFFSET ' + offset + ' ROWS';
      if (limit) out += ' FETCH NEXT ' + limit + ' ROWS ONLY';
    }
    return out;
  }

  /**
   * Rewrites two comparison shapes T-SQL can't express directly:
   * - `= @param`/`<> @param` where the bound parameter turns out to hold an
   *   array is rewritten as `IN (...)`/`NOT IN (...)` (T-SQL has no array
   *   binding, so an array-valued equality would otherwise serialize as a
   *   single, incorrect scalar comparison).
   * - `= null`/`<> null` (including an unbound `@param` that resolved to
   *   `null`) is rewritten as `IS NULL`/`IS NOT NULL`, since T-SQL's
   *   `= NULL`/`<> NULL` don't mean what they look like (they follow
   *   `ANSI_NULLS`, not SQL's three-valued-logic semantics).
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
        (!o.right.expression || o.right.expression.startsWith('@')))
    ) {
      if (o.right.expression?.startsWith('@')) {
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

  /** T-SQL has no native boolean type: renders as the `bit` literals `1`/`0` (or `null`). */
  private _serializeBooleanValue(_ctx: SerializeContext, o: any): string {
    return o == null ? 'null' : o ? '1' : '0';
  }

  /**
   * Normalizes an ISO-8601 string carrying a `T` date/time separator (e.g.
   * from JSON test fixtures) into T-SQL's `'yyyy-mm-dd hh:mm:ss'` literal
   * via {@link SerializeContext.dateToSQL}, since T-SQL's implicit
   * conversion of such strings into `datetime`/`date` is unreliable.
   * Any other string falls through to the base serializer.
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
   * Suppresses the base serializer's `RETURNING` clause entirely. T-SQL has
   * no `RETURNING`; the `OUTPUT` clause it uses instead must be positioned
   * before `WHERE`/`VALUES` rather than at the statement's end, so it can't
   * be produced by this hook and is injected at the connection layer
   * instead (see `@sqb/mssql`).
   */
  private _serializeReturning(): string {
    return '';
  }

  /**
   * Rewrites a parameter reference bound to an array (only meaningful for
   * a `SELECT`/`DELETE` query) into an inline SQL list via
   * {@link SerializeContext.anyToSQL}, since T-SQL has no array parameter
   * binding; the parameter is then removed from `ctx.params` so it isn't
   * also sent as a bind value. Any other parameter serializes as the usual
   * `@name` placeholder.
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
    defFn(ctx, o);
    return '@' + o.name;
  }
}
