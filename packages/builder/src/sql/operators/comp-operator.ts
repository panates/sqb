import { SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Field, Param } from '../elements/index.js';
import { Operator } from './operator.js';

const EXPRESSION_PATTERN = /^([\w\\.$]+)(\[])?/;

class CompOperatorClass extends Operator {
  _left!: Serializable | string;
  _right?: any | Serializable;
  _symbol?: string;
  _isArray?: boolean;

  get _type(): SerializationType {
    return SerializationType.COMPARISON_EXPRESSION;
  }

  _serialize(ctx: SerializeContext): string {
    const left = this.__serializeItem(ctx, this._left);
    if (this._isArray) left.isArray = true;
    const right = this.__serializeItem(ctx, this._right, left);
    const o: any = {
      operatorType: this._operatorType,
      symbol: this._symbol,
      left,
      right,
    };
    return this.__serialize(ctx, o);
  }

  __serializeItem(
    ctx: SerializeContext,
    x: string | Serializable,
    left?: any,
  ): any {
    const isRight = !!left;
    if (ctx.strictParams && !(x instanceof Serializable) && isRight) {
      ctx.strictParamGenId = ctx.strictParamGenId || 0;
      const name = 'P$_' + ++ctx.strictParamGenId;
      ctx.params = ctx.params || {};
      ctx.params[name] = x;
      x = Param({
        name,
        dataType: left?.dataType,
        isArray: left?.isArray || Array.isArray(x),
      });
    }

    if (x instanceof Serializable) {
      const expression = ctx.anyToSQL(x);
      const result: any = {
        expression,
      };
      if (x instanceof Field) {
        result.dataType = x._dataType;
        result.isArray = x._isArray;
      }
      if (x instanceof Param) {
        let value = ctx.params ? ctx.params[x._name] : undefined;
        if (x._isArray && value != null && !Array.isArray(value))
          value = [value];
        result.value = value;
        result.isArray = x._isArray || Array.isArray(value);
        result.isParam = true;
      }
      return result;
    }
    // noinspection SuspiciousTypeOfGuard
    const result: any = {
      expression: isRight || typeof x !== 'string' ? ctx.anyToSQL(x) : x,
    };
    // noinspection SuspiciousTypeOfGuard
    if (isRight || typeof x !== 'string') result.isArray = Array.isArray(x);
    return result;
  }

  __serialize(ctx: SerializeContext, o: any): string {
    return ctx.serialize(this._type, o, (_ctx: SerializeContext, _o) =>
      this.__defaultSerialize(_ctx, _o),
    );
  }

  __defaultSerialize(ctx: SerializeContext, o: any): string {
    return o.left.expression + ' ' + o.symbol + ' ' + o.right.expression;
  }
}

interface CompOperatorCtor {
  new (left: string | Serializable, right?: any): CompOperator;
  (left: string | Serializable, right?: any): CompOperator;
  prototype: CompOperator;
}

export const CompOperator = function (
  this: CompOperator,
  left: string | Serializable,
  right?: any,
) {
  if (!(this instanceof CompOperator)) return new CompOperator(left, right);
  Operator.call(this);
  if (typeof left === 'string') {
    const m = left.match(EXPRESSION_PATTERN);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  } else this._left = left;
  this._right = right;
} as CompOperatorCtor;

CompOperator.prototype = CompOperatorClass.prototype;
CompOperator.prototype.constructor = CompOperator;

export interface CompOperator extends CompOperatorClass {}
