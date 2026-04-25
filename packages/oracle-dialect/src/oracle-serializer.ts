import {
  type DefaultSerializeFunction,
  OperatorType,
  SerializationType,
  SerializeContext,
  type SerializerExtension,
} from '@sqb/builder';
import { toDateString } from 'valgen';

const reservedWords = ['comment', 'dual'];

export class OracleSerializer implements SerializerExtension {
  dialect = 'oracle';

  isReservedWord(ctx, s) {
    return (
      s && typeof s === 'string' && reservedWords.includes(s.toLowerCase())
    );
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
      if (ctx.dialectVersion && ctx.dialectVersion >= '12') {
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

  private _serializeFrom(
    ctx: SerializeContext,
    arr: any,
    defFn: DefaultSerializeFunction,
  ): string {
    return defFn(ctx, arr) || 'from dual';
  }

  private _serializeComparison(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (
      o.right &&
      o.right.expression?.startsWith(':') &&
      Array.isArray(o.right?.value)
    ) {
      const s = o.right.expression.substring(1);
      if (ctx.params) delete ctx.params[s];
      if (ctx.preparedParams) delete ctx.preparedParams[s];
      if (ctx.paramOptions) delete ctx.paramOptions[s];
      o.right.expression = ctx.anyToSQL(o.right.value);
      o.right.isParam = false;
      if (o.operatorType === 'eq')
        return defFn(ctx, {
          ...o,
          operatorType: OperatorType.is,
          symbol: 'in',
        });
      if (o.operatorType === 'ne')
        return defFn(ctx, {
          ...o,
          operatorType: OperatorType.isNot,
          symbol: 'not in',
        });
    } else if (
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

  private _serializeStringValue(
    ctx: SerializeContext,
    o: any,
    defFn: DefaultSerializeFunction,
  ): string {
    if (typeof o === 'string') {
      if (o.match(/^\d{4}-\d{2}-\d{2}$/))
        return 'to_date(' + o + ", 'yyyy-mm-dd')";
      if (o.match(/^\d{4}-\d{2}-\d{2}T/))
        return `to_timestamp_tz('${o}','yyyy-mm-dd"T"hh24:mi:sstzh:tzm')`;
    }
    return defFn(ctx, o);
  }

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

  private _serializeBooleanValue(_ctx: SerializeContext, o: any): string {
    return o == null ? 'null' : o ? '1' : '0';
  }

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

  private _serializeReturning(): string {
    return '';
  }

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
      if (v instanceof Date) {
        ctx.preparedParams = ctx.preparedParams || {};
        ctx.preparedParams[o.name] = toDateString(v).replace('T', ' ');
        return `TO_DATE(:${o.name}, 'yyyy-mm-dd hh24:mi:ss.SSSSS')`;
      }
    }
    return defFn(ctx, o);
  }
}
