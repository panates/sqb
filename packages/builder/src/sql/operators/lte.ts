import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

/** A `<=` (less than or equal) comparison. Construct via the exported {@link Lte} factory rather than this class directly. */
class LteClass extends CompOperator {}

interface LteCtor {
  new (left: string | SqlElement, right?: any): Lte;
  (left: string | SqlElement, right?: any): Lte;
  prototype: Lte;
}

/**
 * Creates a `<=` comparison (`left <= right`). Callable with or without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The value (or {@link SqlElement}) to compare against.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const Lte = function (
  this: Lte,
  left: string | SqlElement,
  right?: any,
) {
  if (!(this instanceof Lte)) return new Lte(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.lte;
  this._symbol = '<=';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as LteCtor;

Lte.prototype = LteClass.prototype;
Lte.prototype.constructor = Lte;

export interface Lte extends LteClass {}
