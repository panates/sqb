import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { Between } from './between.js';

class NotBetweenClass extends Between {}

interface NotBetweenCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): NotBetween;
  new (left: string | SqlElement, right1: any, right2: any): NotBetween;
  (left: string | SqlElement, right: any[] | SqlElement): NotBetween;
  (left: string | SqlElement, right1: any, right2: any): NotBetween;
  prototype: NotBetween;
}

export const NotBetween = function (
  this: NotBetween,
  left: string | SqlElement,
  right1: any,
  right2: any,
) {
  if (!(this instanceof NotBetween))
    return new NotBetween(left, right1, right2);
  Between.call(this, left, right1, right2);
  this._operatorType = OperatorType.notBetween;
  this._symbol = 'not between';
} as NotBetweenCtor;

NotBetween.prototype = NotBetweenClass.prototype;
NotBetween.prototype.constructor = NotBetween;

export interface NotBetween extends NotBetweenClass {}
