import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { ILike } from './i-like.js';

/** A case-insensitive `NOT ILIKE` comparison. Construct via the exported {@link NotILike} factory rather than this class directly. */
class NotILikeClass extends ILike {}

interface NotILikeCtor {
  new (left: string | SqlElement, right?: string | SqlElement): NotILike;
  (left: string | SqlElement, right?: string | SqlElement): NotILike;
  prototype: NotILike;
}

/**
 * Creates a case-insensitive `NOT ILIKE` comparison (`left not ilike right`).
 * Callable with or without `new`. See {@link ILike} for a note on dialect
 * support.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The pattern to match against, or a {@link SqlElement}.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
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
