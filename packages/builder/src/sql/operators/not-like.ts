import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { Like } from './like.js';

class NotLikeClass extends Like {}

interface NotLikeCtor {
  new (left: string | SqlElement, right?: string | SqlElement): NotLike;
  (left: string | SqlElement, right?: string | SqlElement): NotLike;
  prototype: NotLike;
}

export const NotLike = function (
  this: NotLike,
  left: string | SqlElement,
  right?: string | SqlElement,
) {
  if (!(this instanceof NotLike)) return new NotLike(left, right);
  Like.call(this, left, right);
  this._operatorType = OperatorType.notLike;
  this._symbol = 'not like';
} as NotLikeCtor;

NotLike.prototype = NotLikeClass.prototype;
NotLike.prototype.constructor = NotLike;

export interface NotLike extends NotLikeClass {}
