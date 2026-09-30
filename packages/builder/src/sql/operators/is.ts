import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

/** An `IS` comparison (typically used for `IS NULL`/`IS TRUE`/`IS FALSE`-style checks). Construct via the exported {@link Is} factory rather than this class directly. */
class IsClass extends CompOperator {}

interface IsCtor {
  new (left: string | SqlElement, right?: any): Is;
  (left: string | SqlElement, right?: any): Is;
  prototype: Is;
}

/**
 * Creates an `IS` comparison (`left is right`), e.g. `Is('deletedAt', null)`
 * for `deletedAt is null`. Callable with or without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The value (or {@link SqlElement}) to compare against - typically `null`, `true`, or `false`.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const Is = function (this: Is, left: string | SqlElement, right?: any) {
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
