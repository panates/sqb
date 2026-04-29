import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class EqClass extends CompOperator {}

interface EqCtor {
  new (left: string | SqlElement, right: any): Eq;
  (left: string | SqlElement, right: any): Eq;
  prototype: Eq;
}

export const Eq = function (this: Eq, left: string | SqlElement, right: any) {
  if (!(this instanceof Eq)) return new Eq(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.eq;
  this._symbol = '=';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  } else this._left = left;
  this._right = right;
} as EqCtor;

Eq.prototype = EqClass.prototype;
Eq.prototype.constructor = Eq;

export interface Eq extends EqClass {}
