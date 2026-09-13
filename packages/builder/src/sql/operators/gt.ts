import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

/** A `>` (greater than) comparison. Construct via the exported {@link Gt} factory rather than this class directly. */
class GtClass extends CompOperator {}

interface GtCtor {
  new (left: string | SqlElement, right?: any): Gt;
  (left: string | SqlElement, right?: any): Gt;
  prototype: Gt;
}

/**
 * Creates a `>` comparison (`left > right`). Callable with or without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The value (or {@link SqlElement}) to compare against.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const Gt = function (this: Gt, left: string | SqlElement, right?: any) {
  if (!(this instanceof Gt)) return new Gt(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.gt;
  this._symbol = '>';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as GtCtor;

Gt.prototype = GtClass.prototype;
Gt.prototype.constructor = Gt;

export interface Gt extends GtClass {}
