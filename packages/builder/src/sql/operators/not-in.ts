import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { In } from './in.js';

class NotInClass extends In {}

interface NotInCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): NotIn;
  (left: string | SqlElement, right: any[] | SqlElement): NotIn;
  prototype: NotIn;
}

export const NotIn = function (
  this: NotIn,
  left: string | SqlElement,
  right: any[],
) {
  if (!(this instanceof NotIn)) return new NotIn(left, right);
  In.call(this, left, right);
  this._operatorType = OperatorType.notIn;
  this._symbol = 'not in';
} as NotInCtor;

NotIn.prototype = NotInClass.prototype;
NotIn.prototype.constructor = NotIn;

export interface NotIn extends NotInClass {}
