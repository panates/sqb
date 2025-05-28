import {
  DefaultSerializeFunction,
  SerializationType,
  SerializeContext,
  SerializerExtension,
} from '@sqb/builder';

export class SqliteSerializer implements SerializerExtension {
  dialect = 'sqlite';

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
