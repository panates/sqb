import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { In } from './in.js';

/** A `NOT IN (...)` membership comparison. Construct via the exported {@link NotIn} factory rather than this class directly. */
class NotInClass extends In {}

interface NotInCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): NotIn;
  (left: string | SqlElement, right: any[] | SqlElement): NotIn;
  prototype: NotIn;
}

/**
 * Creates a `NOT IN (...)` membership comparison. Callable with or without
 * `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The candidate values, or a {@link SqlElement} (e.g. a sub-`Select`); a non-array, non-`SqlElement` value is wrapped into a single-element array.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
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
