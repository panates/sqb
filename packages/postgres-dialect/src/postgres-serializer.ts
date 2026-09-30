import {
  type DefaultSerializeFunction,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

/**
 * PostgreSQL "reserved" and "reserved (can be function or type)" keywords
 * (https://www.postgresql.org/docs/current/sql-keywords-appendix.html)
 * that are not already covered by {@link SerializeContext}'s base
 * reserved-words list. Keywords common to all SQL dialects (`case`,
 * `check`, `union`, ...) live in `SerializeContext.reservedWords` instead
 * of being duplicated here.
 */
const reservedWords = new Set([
  'analyse',
  'analyze',
  'any',
  'array',
  'asymmetric',
  'binary',
  'both',
  'collate',
  'collation',
  'comment',
  'concurrently',
  'cross',
  'current_catalog',
  'current_date',
  'current_role',
  'current_schema',
  'current_time',
  'current_timestamp',
  'current_user',
  'deferrable',
  'do',
  'except',
  'false',
  'fetch',
  'freeze',
  'grant',
  'initially',
  'intersect',
  'isnull',
  'lateral',
  'leading',
  'limit',
  'localtime',
  'localtimestamp',
  'natural',
  'notnull',
  'offset',
  'only',
  'overlaps',
  'placing',
  'returning',
  'session_user',
  'similar',
  'some',
  'symmetric',
  'system_user',
  'tablesample',
  'trailing',
  'true',
  'using',
  'variadic',
  'verbose',
  'window',
]);

/**
 * `@sqb/builder` {@link SerializerExtension} for PostgreSQL, handling the
 * PostgreSQL-specific quirks the base serializer can't cover: `LIMIT`/
 * `OFFSET` pagination, `= NULL`/`<> NULL` rewritten as `IS`/`IS NOT NULL`
 * (removing the now-unused positional parameter), `IN`/`NOT IN` against a
 * PostgreSQL array column rewritten as `= ANY(...)`/`!= ANY(...)` or the
 * `&&` overlap operator, `MATCH` rewritten as full-text search via `@@`/
 * `plainto_tsquery`, and PostgreSQL's positional `$1, $2, ...` parameter
 * placeholders (rather than named binds).
 */
export class PostgresSerializer implements SerializerExtension {
  dialect = 'postgres';
  reservedWords = reservedWords;

  /** Case-insensitive check against PostgreSQL's {@link reservedWords} list. */
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
      case SerializationType.EXTERNAL_PARAMETER:
        return this._serializeParameter(ctx, o, defFn);
      default:
        return undefined;
    }
  }

  /** Appends PostgreSQL's `LIMIT`/`OFFSET` pagination clause when the query has a `limit`/`offset` - both are supported independently, so unlike some other dialects no extra rewriting is needed for an offset-only query. */
  private _serializeSelect(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    let out = defFn(ctx, o);
    const limit = o.limit || 0;
    const offset = Math.max(o.offset || 0, 0);
    if (limit) out += '\nLIMIT ' + limit;
    if (offset) out += (!limit ? '\n' : ' ') + 'OFFSET ' + offset;
    return out;
  }

  /**
   * Rewrites several comparison shapes PostgreSQL needs special handling
   * for:
   * - `= null`/`<> null` (including an unbound `$n` positional placeholder
   *   that resolved to `null`) is rewritten as `IS NULL`/`IS NOT NULL`;
   *   the now-unused positional parameter is spliced out of
   *   `ctx.preparedParams`/`ctx.paramOptions` (tracked in
   *   `ctx.removedParams` so the same index isn't spliced out twice).
   * - A scalar value bound to a param flagged `isArray` (an array-typed
   *   column compared against a single value) is wrapped in a one-element
   *   array first, since PostgreSQL array columns need an actual array
   *   bind even for a single value.
   * - `IN`/`NOT IN` against a PostgreSQL array is rewritten: array column
   *   vs. a scalar param becomes `= ANY(...)`/`!= ANY(...)` (either side,
   *   whichever is the array); array column vs. an array param becomes
   *   the `&&` overlap operator instead (with the array side negated via
   *   a leading `not` for `NOT IN`) - PostgreSQL has no direct `IN`
   *   syntax against an array type.
   * - `MATCH` is rewritten to full-text search via the `@@` operator and
   *   `plainto_tsquery(config, ...)`, `config` coming from the operator's
   *   custom args (defaulting to the `'simple'` text search
   *   configuration).
   */
  private _serializeComparison(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (o.right) {
      if (
        (o.right.expression && o.right?.expression === 'null') ||
        (o.right.value == null &&
          (!o.right.expression || o.right.expression.startsWith('$')))
      ) {
        if (o.right.expression?.startsWith('$')) {
          const i = parseInt(o.right.expression.substring(1), 10);
          if (i > 0) {
            const _ctx = ctx as any;
            _ctx.removedParams = _ctx.removedParams || [];
            if (!_ctx.removedParams.includes(i)) {
              _ctx.removedParams.push(i);
              if (Array.isArray(ctx.preparedParams))
                ctx.preparedParams.splice(i - 1, 1);
              if (Array.isArray(ctx.paramOptions))
                ctx.paramOptions.splice(i - 1, 1);
            }
          }

          o.right.expression = 'null';
          o.right.isParam = false;
        }
        if (o.operatorType === OperatorType.eq)
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

      if (
        o.left.isParam &&
        o.left.isArray &&
        o.left.value != null &&
        !Array.isArray(o.left.value)
      ) {
        o.left.value = [o.left.value];
      }

      if (
        o.right.isParam &&
        o.right.isArray &&
        o.right.value != null &&
        !Array.isArray(o.right.value)
      ) {
        o.right.value = [o.right.value];
      }

      if (
        o.operatorType === OperatorType.in ||
        o.operatorType === OperatorType.notIn
      ) {
        if (o.left.isArray && !o.right.isArray && o.right.isParam) {
          const left = o.left;
          const right = o.right;
          left.expression = 'ANY(' + left.expression + ')';
          return defFn(ctx, {
            ...o,
            operatorType: OperatorType.eq,
            symbol: o.operatorType === OperatorType.notIn ? '!=' : '=',
            left: right,
            right: left,
          });
        }
        if (o.left.isArray && o.right.isArray) {
          if (o.operatorType === OperatorType.notIn)
            o.left.expression = 'not ' + o.left.expression;
          return defFn(ctx, { ...o, symbol: '&&' });
        }
        if (!o.left.isArray && o.right.isArray && o.right.isParam) {
          o.right.expression = 'ANY(' + o.right.expression + ')';
          return defFn(ctx, {
            ...o,
            operatorType: OperatorType.eq,
            symbol: o.operatorType === OperatorType.notIn ? '!=' : '=',
          });
        }
      }
      if (o.operatorType === OperatorType.match) {
        const config = o.customArgs
          ? typeof o.customArgs === 'object'
            ? o.customArgs
            : String(o.customArgs)
          : undefined;
        o.symbol = '@@';
        o.right.expression = `plainto_tsquery('${(config || 'simple').replace(/'/g, '"')}', ${o.right.expression})`;
        return defFn(ctx, o);
      }
    }
    return defFn(ctx, o);
  }

  /** Renders a parameter as PostgreSQL's positional `$n` placeholder, `n` being the parameter's 1-based position in `ctx.preparedParams` after `defFn` appends it. */
  private _serializeParameter(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    ctx.preparedParams = ctx.preparedParams || [];
    defFn(ctx, o);
    return '$' + ctx.preparedParams.length;
  }
}
