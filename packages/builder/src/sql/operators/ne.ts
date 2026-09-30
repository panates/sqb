import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

/** A `!=` (not equals) comparison. Construct via the exported {@link Ne} factory rather than this class directly. */
class NeClass extends CompOperator {}

interface NeCtor {
  new (left: string | SqlElement, right?: any): Ne;
  (left: string | SqlElement, right?: any): Ne;
  prototype: Ne;
}

/**
 * Creates a `!=` comparison (`left != right`). Callable with or without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The value (or {@link SqlElement}) to compare against.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const Ne = function (this: Ne, left: string | SqlElement, right?: any) {
  if (!(this instanceof Ne)) return new Ne(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.ne;
  this._symbol = '!=';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as NeCtor;

Ne.prototype = NeClass.prototype;
Ne.prototype.constructor = Ne;

export interface Ne extends NeClass {}
