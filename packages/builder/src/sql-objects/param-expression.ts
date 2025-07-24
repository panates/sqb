import { DataType, SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { ParamOptions } from '../types.js';

export class ParamExpression extends Serializable {
  _name: string;
  _dataType?: DataType;
  _isArray?: boolean;

  constructor(
    arg: string | { name: string; dataType?: DataType; isArray?: boolean },
  ) {
    super();
    if (typeof arg === 'object') {
      this._name = arg.name;
      this._dataType = arg.dataType;
      this._isArray = arg.isArray;
    } else this._name = arg;
  }

  get _type(): SerializationType {
    return SerializationType.EXTERNAL_PARAMETER;
  }

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string {
    const o = {
      name: this._name,
      dataType: this._dataType,
      isArray: this._isArray,
    };
    return ctx.serialize(this._type, o, () => this.__defaultSerialize(ctx, o));
  }

  protected __defaultSerialize(
    ctx: SerializeContext,
    o: {
      name: string;
      dataType?: DataType;
      isArray?: boolean;
    },
  ): string {
    let prmValue = (ctx.params && ctx.params[o.name]) ?? null;
    if (prmValue != null && o.isArray && !Array.isArray(prmValue))
      prmValue = [prmValue];
    ctx.preparedParams = ctx.preparedParams || {};
    if (Array.isArray(ctx.preparedParams)) ctx.preparedParams.push(prmValue);
    else ctx.preparedParams[o.name] = prmValue;

    const paramOps: ParamOptions = {
      dataType: this._dataType,
      isArray: this._isArray,
    };
    ctx.paramOptions =
      ctx.paramOptions || (Array.isArray(ctx.preparedParams) ? [] : {});
    if (Array.isArray(ctx.paramOptions)) ctx.paramOptions.push(paramOps);
    else ctx.paramOptions[o.name] = paramOps;
    return ':' + o.name;
  }
}
