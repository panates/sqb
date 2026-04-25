import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { Is } from './is.js';

class IsNotClass extends Is {}

interface IsNotCtor {
  new (left: string | Serializable, right?: any): IsNot;
  (left: string | Serializable, right?: any): IsNot;
  prototype: IsNot;
}

export const IsNot = function (
  this: IsNot,
  left: string | Serializable,
  right?: any,
) {
  if (!(this instanceof IsNot)) return new IsNot(left, right);
  Is.call(this, left, right);
  this._operatorType = OperatorType.isNot;
  this._symbol = 'is not';
} as IsNotCtor;

IsNot.prototype = IsNotClass.prototype;
IsNot.prototype.constructor = IsNot;

export interface IsNot extends IsNotClass {}
