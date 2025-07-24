import { SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Param } from '../../sqlobject.initializers.js';
import { FieldExpression } from '../field-expression.js';
import { Operator } from '../operator.js';
import { ParamExpression } from '../param-expression.js';

const EXPRESSION_PATTERN = /^([\w\\.$]+)(\[])?/;

export abstract class CompOperator extends Operator {
  _left: Serializable | string;
  _right?: any | Serializable;
  _symbol?: string;
  _isArray?: boolean;

  protected constructor(left: string | Serializable, right?: any) {
    super();
    if (typeof left === 'string') {
      const m = left.match(EXPRESSION_PATTERN);
      if (!m)
        throw new TypeError(`"${left}" is not a valid expression definition`);
      this._left = m[1];
      this._isArray = !!m[2];
    } else this._left = left;
    this._right = right;
  }

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

  protected __serializeItem(
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
      x = Param(name, left?.dataType, left?.isArray || Array.isArray(x));
    }

    if (x instanceof Serializable) {
      const expression = ctx.anyToSQL(x);
      const result: any = {
        expression,
      };
      if (x instanceof FieldExpression) {
        result.dataType = x._dataType;
        result.isArray = x._isArray;
      }
      if (x instanceof ParamExpression) {
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

  protected __serialize(ctx: SerializeContext, o: any): string {
    return ctx.serialize(this._type, o, (_ctx: SerializeContext, _o) =>
      this.__defaultSerialize(_ctx, _o),
    );
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return o.left.expression + ' ' + o.symbol + ' ' + o.right.expression;
  }
}
