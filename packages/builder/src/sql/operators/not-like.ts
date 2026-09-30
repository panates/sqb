import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { Like } from './like.js';

/** A `NOT LIKE` comparison. Construct via the exported {@link NotLike} factory rather than this class directly. */
class NotLikeClass extends Like {}

interface NotLikeCtor {
  new (left: string | SqlElement, right?: string | SqlElement): NotLike;
  (left: string | SqlElement, right?: string | SqlElement): NotLike;
  prototype: NotLike;
}

/**
 * Creates a `NOT LIKE` comparison (`left not like right`). Callable with or
 * without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The pattern to match against, or a {@link SqlElement}.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
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
