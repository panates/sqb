import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

class IsClass extends CompOperator {}

interface IsCtor {
  new (left: string | Serializable, right?: any): Is;
  (left: string | Serializable, right?: any): Is;
  prototype: Is;
}

export const Is = function (
  this: Is,
  left: string | Serializable,
  right?: any,
) {
  if (!(this instanceof Is)) return new Is(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.is;
  this._symbol = 'is';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as IsCtor;

Is.prototype = IsClass.prototype;
Is.prototype.constructor = Is;

export interface Is extends IsClass {}
