import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class NeClass extends CompOperator {}

interface NeCtor {
  new (left: string | Serializable, right?: any): Ne;
  (left: string | Serializable, right?: any): Ne;
  prototype: Ne;
}

export const Ne = function (
  this: Ne,
  left: string | Serializable,
  right?: any,
) {
  if (!(this instanceof Ne)) return new Ne(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.ne;
  this._symbol = '!=';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as NeCtor;

Ne.prototype = NeClass.prototype;
Ne.prototype.constructor = Ne;

export interface Ne extends NeClass {}
