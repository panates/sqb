import { SerializationType, SerializeContext } from '../../src/index.js';

export class TestSerializer {
  dialect = 'test';

  serialize(ctx, type, o, defFn) {
    switch (type) {
      case SerializationType.EXTERNAL_PARAMETER:
        return this._serializeParameter(ctx, o);
      default:
        break;
    }
    return defFn(ctx, o);
  }

  isReservedWord() {
    return false;
  }

  private _serializeParameter(ctx: SerializeContext, o: any): string {
    const prmValue = ctx.params && ctx.params[o.name];
    ctx.preparedParams = ctx.preparedParams || {};
    if (prmValue !== undefined) ctx.preparedParams[o.name] = prmValue;
    return '__' + o.name;
  }
}
