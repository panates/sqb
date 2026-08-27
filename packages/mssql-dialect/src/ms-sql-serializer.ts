import {
  type DefaultSerializeFunction,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';

// T-SQL reserved keywords (Reserved Keywords (Transact-SQL), learn.microsoft.com)
// that are not already covered by SerializeContext's base reservedWords list.
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

export class MSSqlSerializer implements SerializerExtension {
  dialect = 'mssql';
  reservedWords = reservedWords;

  isReservedWord(_: any, s: any) {
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
      case SerializationType.EXTERNAL_PARAMETER:
        return this._serializeParameter(ctx, o, defFn);
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
    if (offset) out += '\nOFFSET ' + offset + ' ROWS';
    if (limit)
      out += (!offset ? '\n' : ' ') + 'FETCH NEXT ' + limit + ' ROWS ONLY';
    return out;
  }

  private _serializeParameter(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    defFn(ctx, o);
    return '@' + o.name;
  }
}
