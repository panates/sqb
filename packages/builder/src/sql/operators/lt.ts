import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class LtClass extends CompOperator {}

interface LtCtor {
  new (left: string | Serializable, right?: any): Lt;
  (left: string | Serializable, right?: any): Lt;
  prototype: Lt;
}

export const Lt = function (
  this: Lt,
  left: string | Serializable,
  right?: any,
) {
  if (!(this instanceof Lt)) return new Lt(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.lt;
  this._symbol = '<';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as LtCtor;

Lt.prototype = LtClass.prototype;
Lt.prototype.constructor = Lt;

export interface Lt extends LtClass {}
