import {
  type DefaultSerializeFunction,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

// SQLite keywords (https://www.sqlite.org/lang_keywords.html) that are not
// already covered by SerializeContext's base reservedWords list.
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

export class SqliteSerializer implements SerializerExtension {
  dialect = 'sqlite';
  reservedWords = reservedWords;

  isReservedWord(_: any, s: any): boolean {
    return s && typeof s === 'string' && reservedWords.has(s.toLowerCase());
  }

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
      default:
        break;
    }
  }

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
