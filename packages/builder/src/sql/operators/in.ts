import { OperatorType } from '../../enums.js';
import type { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { isSqlElement } from '../../type-guards.js';
import { CompOperator } from './comp-operator.js';

/** An `IN (...)` membership comparison. Construct via the exported {@link In} factory rather than this class directly. */
class InClass extends CompOperator {
  /**
   * Serializes as `<left> in (<list>)`, with one exception: an empty list
   * serializes as the self-contained literal `1=0` (`IN ()` is invalid SQL,
   * and always false anyway), or `1=1` for {@link NotIn} (always true) -
   * see the inline comment for why this can't just drop the condition.
   */
  _serialize(ctx: SerializeContext): string {
    if (Array.isArray(this._right) && !this._right.length) {
      // Nothing can be IN an empty list (always false), and everything is
      // NOT IN an empty list (always true). Emit a self-contained literal
      // instead of dropping the condition, which would silently invert its
      // meaning into "no filter at all".
      return this._operatorType === OperatorType.notIn ? '1=1' : '1=0';
    }
    return super._serialize(ctx);
  }
}

interface InCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): In;
  (left: string | SqlElement, right: any[] | SqlElement): In;
  prototype: In;
}

/**
 * Creates an `IN (...)` membership comparison. Callable with or without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The candidate values, or a {@link SqlElement} (e.g. a sub-`Select`); a non-array, non-`SqlElement` value is wrapped into a single-element array.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const In = function (this: In, left: string | SqlElement, right: any[]) {
  if (!(this instanceof In)) return new In(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.in;
  this._symbol = 'in';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
  this._right = Array.isArray(right) || isSqlElement(right) ? right : [right];
} as InCtor;

In.prototype = InClass.prototype;
In.prototype.constructor = In;

export interface In extends InClass {}
