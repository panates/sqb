import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { ILike } from './i-like.js';

class NotILikeClass extends ILike {}

interface NotILikeCtor {
  new (left: string | SqlElement, right?: string | SqlElement): NotILike;
  (left: string | SqlElement, right?: string | SqlElement): NotILike;
  prototype: NotILike;
}

export const NotILike = function (
  this: NotILike,
  left: string | SqlElement,
  right?: string | SqlElement,
) {
  if (!(this instanceof NotILike)) return new NotILike(left, right);
  ILike.call(this, left, right);
  this._operatorType = OperatorType.notILike;
  this._symbol = 'not ilike';
} as NotILikeCtor;

NotILike.prototype = NotILikeClass.prototype;
NotILike.prototype.constructor = NotILike;

export interface NotILike extends NotILikeClass {}
