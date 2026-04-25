import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class GtClass extends CompOperator {}

interface GtCtor {
  new (left: string | Serializable, right?: any): Gt;
  (left: string | Serializable, right?: any): Gt;
  prototype: Gt;
}

export const Gt = function (
  this: Gt,
  left: string | Serializable,
  right?: any,
) {
  if (!(this instanceof Gt)) return new Gt(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.gt;
  this._symbol = '>';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as GtCtor;

Gt.prototype = GtClass.prototype;
Gt.prototype.constructor = Gt;

export interface Gt extends GtClass {}
