import { OperatorType } from '../../enums.js';
import type { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { isSerializable } from '../../type-guards.js';
import { CompOperator } from './comp-operator.js';

class InClass extends CompOperator {
  _serialize(ctx: SerializeContext): string {
    if (Array.isArray(this._right) && !this._right.length) return '';
    return super._serialize(ctx);
  }
}

interface InCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): In;
  (left: string | SqlElement, right: any[] | SqlElement): In;
  prototype: In;
}

export const In = function (this: In, left: string | SqlElement, right: any[]) {
  if (!(this instanceof In)) return new In(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.in;
  this._symbol = 'in';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
  this._right = Array.isArray(right) || isSerializable(right) ? right : [right];
} as InCtor;

In.prototype = InClass.prototype;
In.prototype.constructor = In;

export interface In extends InClass {}
