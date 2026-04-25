import { DataType, SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import type { ParamOptions } from '../../types.js';

class ParamClass extends Serializable {
  _name!: string;
  _dataType?: DataType;
  _isArray?: boolean;

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

interface ParamCtor {
  new (arg: string | Param.Args): Param;
  new (name: string, dataType?: DataType, isArray?: boolean): Param;
  (arg: string | Param.Args): Param;
  (name: string, dataType?: DataType, isArray?: boolean): Param;
  prototype: Param;
}

export const Param = function (this: Param, ...varArgs: any[]) {
  let args: Param.Args;
  if (varArgs.length === 1 && typeof varArgs[0] === 'object') {
    args = varArgs[0];
  } else {
    args = {
      name: varArgs[0],
    };
    if (varArgs.length > 1) args.dataType = varArgs[1];
    if (varArgs.length > 2) args.isArray = varArgs[2];
  }
  if (!(this instanceof Param)) return new Param(args);
  Serializable.call(this);
  this._name = args.name;
  this._dataType = args.dataType;
  this._isArray = args.isArray;
} as ParamCtor;

Param.prototype = ParamClass.prototype;
Param.prototype.constructor = Param;

export interface Param extends ParamClass {}

export namespace Param {
  export interface Args {
    name: string;
    dataType?: DataType;
    isArray?: boolean;
  }
}
