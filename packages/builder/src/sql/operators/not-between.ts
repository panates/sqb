import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { Between } from './between.js';

/** A `NOT BETWEEN low AND high` range comparison. Construct via the exported {@link NotBetween} factory rather than this class directly. */
class NotBetweenClass extends Between {}

interface NotBetweenCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): NotBetween;
  new (left: string | SqlElement, right1: any, right2: any): NotBetween;
  (left: string | SqlElement, right: any[] | SqlElement): NotBetween;
  (left: string | SqlElement, right1: any, right2: any): NotBetween;
  prototype: NotBetween;
}

/**
 * Creates a `NOT BETWEEN low AND high` range comparison. Callable with or
 * without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right1 - Either a two-element `[low, high]` array, or the range's low bound (paired with `right2`).
 * @param right2 - The range's high bound, when `right1` is the low bound rather than a `[low, high]` array; defaults to `right1` if omitted.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
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
