import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class LteClass extends CompOperator {}

interface LteCtor {
  new (left: string | SqlElement, right?: any): Lte;
  (left: string | SqlElement, right?: any): Lte;
  prototype: Lte;
}

export const Lte = function (
  this: Lte,
  left: string | SqlElement,
  right?: any,
) {
  if (!(this instanceof Lte)) return new Lte(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.lte;
  this._symbol = '<=';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as LteCtor;

Lte.prototype = LteClass.prototype;
Lte.prototype.constructor = Lte;

export interface Lte extends LteClass {}
