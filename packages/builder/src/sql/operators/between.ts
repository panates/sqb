import { OperatorType } from '../../enums.js';
import type { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { CompOperator } from './comp-operator.js';

class BetweenClass extends CompOperator {
  _serialize(ctx: SerializeContext): string {
    if (!(this._right && this._right.length > 0)) return '';
    const left = this.__serializeItem(ctx, this._left);
    const right = [
      this.__serializeItem(ctx, this._right[0], true),
      this.__serializeItem(ctx, this._right[1], true),
    ];
    const o: any = {
      operatorType: this._operatorType,
      symbol: this._symbol,
      left,
      right,
    };
    return this.__serialize(ctx, o);
  }

  __defaultSerialize(ctx: SerializeContext, o: any) {
    return (
      o.left.expression +
      ' ' +
      o.symbol +
      ' ' +
      o.right[0].expression +
      ' and ' +
      o.right[1].expression
    );
  }
}

interface BetweenCtor {
  new (left: string | Serializable, right: any[] | Serializable): Between;
  new (left: string | Serializable, right1: any, right2: any): Between;
  (left: string | Serializable, right: any[] | Serializable): Between;
  (left: string | Serializable, right1: any, right2: any): Between;
  prototype: Between;
}

export const Between = function (
  this: Between,
  left: string | Serializable,
  right1: any,
  right2: any,
) {
  const right = Array.isArray(right1) ? right1 : [right1, right2];
  if (!(this instanceof Between)) return new Between(left, right);
  if (right && right[1] == null) right[1] = right[0];
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.between;
  this._symbol = 'between';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as BetweenCtor;

Between.prototype = BetweenClass.prototype;
Between.prototype.constructor = Between;

export interface Between extends BetweenClass {}
