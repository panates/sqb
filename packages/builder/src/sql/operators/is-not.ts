import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { Is } from './is.js';

/** An `IS NOT` comparison. Construct via the exported {@link IsNot} factory rather than this class directly. */
class IsNotClass extends Is {}

interface IsNotCtor {
  new (left: string | SqlElement, right?: any): IsNot;
  (left: string | SqlElement, right?: any): IsNot;
  prototype: IsNot;
}

/**
 * Creates an `IS NOT` comparison (`left is not right`), e.g.
 * `IsNot('deletedAt', null)` for `deletedAt is not null`. Callable with or
 * without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The value (or {@link SqlElement}) to compare against - typically `null`, `true`, or `false`.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const IsNot = function (
  this: IsNot,
  left: string | SqlElement,
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
