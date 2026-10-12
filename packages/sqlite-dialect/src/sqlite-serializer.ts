import {
  type DefaultSerializeFunction,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

/**
 * SQLite keywords (https://www.sqlite.org/lang_keywords.html) that are not
 * already covered by {@link SerializeContext}'s base reserved-words list.
 */
const reservedWords = new Set([
  'abort',
  'action',
  'after',
  'always',
  'analyze',
  'attach',
  'autoincrement',
  'before',
  'begin',
  'collate',
  'commit',
  'conflict',
  'cross',
  'current',
  'current_date',
  'current_time',
  'current_timestamp',
  'database',
  'deferrable',
  'deferred',
  'detach',
  'do',
  'each',
  'escape',
  'exclusive',
  'exists',
  'explain',
  'fail',
  'filter',
  'first',
  'following',
  'generated',
  'glob',
  'groups',
  'if',
  'ignore',
  'immediate',
  'indexed',
  'initially',
  'instead',
  'intersect',
  'isnull',
  'last',
  'limit',
  'match',
  'materialized',
  'natural',
  'no',
  'nothing',
  'notnull',
  'nulls',
  'of',
  'offset',
  'others',
  'over',
  'partition',
  'plan',
  'pragma',
  'preceding',
  'query',
  'raise',
  'range',
  'recursive',
  'regexp',
  'reindex',
  'release',
  'rename',
  'replace',
  'restrict',
  'returning',
  'rollback',
  'row',
  'rows',
  'savepoint',
  'set',
  'temp',
  'temporary',
  'ties',
  'transaction',
  'trigger',
  'unbounded',
  'using',
  'vacuum',
  'values',
  'view',
  'virtual',
  'window',
  'without',
]);

/**
 * `@sqb/builder` {@link SerializerExtension} for SQLite, handling the
 * SQLite-specific quirks the base serializer can't cover: `LIMIT`/`OFFSET`
 * pagination, suppressing the base serializer's `RETURNING` clause
 * (see {@link _serializeReturning}), and `MATCH` as FTS5 full-text search
 * (see {@link _serializeMatch}).
 */
export class SqliteSerializer implements SerializerExtension {
  dialect = 'sqlite';
  reservedWords = reservedWords;

  /** Case-insensitive check against SQLite's {@link reservedWords} list. */
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
      case SerializationType.RETURNING_BLOCK:
        return this._serializeReturning(ctx, o, defFn);
      case SerializationType.COMPARISON_EXPRESSION:
        if (o.operatorType === OperatorType.match)
          return this._serializeMatch(o);
        break;
      default:
        break;
    }
  }

  /** Appends SQLite's `LIMIT`/`OFFSET` pagination clause when the query has a `limit`/`offset` - both are supported independently, so no extra rewriting is needed for an offset-only query. */
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
   * `MATCH` as an FTS5 full-text search. The pattern is an FTS5 query (see
   * `toFtsQuery` to search for the words of user input as they are).
   *
   * - `Match('message', value)` - `message MATCH ?`, for a query on the
   *   FTS5 table itself, `message` being one of its columns.
   * - `Match('message', value, 'logs_fts')` - the rows of the queried
   *   table whose `message` the FTS5 table `logs_fts` matches:
   *   `rowid IN (SELECT rowid FROM logs_fts WHERE message MATCH ?)`. For an
   *   external-content FTS5 table (`content=`/`content_rowid=`) indexing the
   *   queried one, whose rowids are the queried table's.
   * - `Match('message', value, { table: 'logs_fts', key: 'l.id' })` - the
   *   same, comparing the FTS5 rowids with `key` rather than `rowid` (an
   *   aliased table in a join, or an `INTEGER PRIMARY KEY` by name).
   */
  private _serializeMatch(o: any): string {
    const args = o.customArgs;
    const table: string | undefined =
      typeof args === 'string' ? args : args?.table;
    if (!table) return `${o.left.expression} MATCH ${o.right.expression}`;
    const key = (typeof args === 'object' && args.key) || 'rowid';
    /* A column of the FTS5 table, whatever the queried table is aliased as */
    const column = String(o.left.expression).split('.').pop();
    return `${key} IN (SELECT rowid FROM ${table} WHERE ${column} MATCH ${o.right.expression})`;
  }

  /**
   * Suppresses the base serializer's `RETURNING` clause entirely, even
   * though SQLite does support a `RETURNING` clause natively: `@sqb/sqlite`
   * emulates it at the connection layer instead (matching the approach
   * used for dialects that lack native support), so this hook only runs
   * the base serializer for its side effects (e.g. registering the
   * requested columns) and discards the text it would have produced.
   */
  // noinspection JSUnusedLocalSymbols
  private _serializeReturning(
    ctx: SerializeContext,
    arr: any[],
    defFn: DefaultSerializeFunction,
  ): string {
    defFn(ctx, arr);
    return '';
  }
}
