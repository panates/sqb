import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class GteClass extends CompOperator {}

interface GteCtor {
  new (left: string | SqlElement, right?: any): Gte;
  (left: string | SqlElement, right?: any): Gte;
  prototype: Gte;
}

export const Gte = function (
  this: Gte,
  left: string | SqlElement,
  right?: any,
) {
  if (!(this instanceof Gte)) return new Gte(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.gte;
  this._symbol = '>=';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as GteCtor;

Gte.prototype = GteClass.prototype;
Gte.prototype.constructor = Gte;

export interface Gte extends GteClass {}
