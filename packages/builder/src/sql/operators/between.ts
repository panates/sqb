import { OperatorType } from '../../enums.js';
import type { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { CompOperator } from './comp-operator.js';

/** A `BETWEEN low AND high` range comparison. Construct via the exported {@link Between} factory rather than this class directly. */
class BetweenClass extends CompOperator {
  /** Serializes as `<left> between <low> and <high>`, or an empty string if no range was given. */
  _serialize(ctx: SerializeContext): string {
    if (!(this._right && this._right.length > 0)) return '';
    const left = this.__serializeItem(ctx, this._left);
    const right = [
      this.__serializeItem(ctx, this._right[0], true),
      this.__serializeItem(ctx, this._right[1], true),
    ];
    const o: any = {
      operatorType: this._operatorType,
      symbol: this._symbol,
      left,
      right,
    };
    return this.__serialize(ctx, o);
  }

  /** Default fallback: `<left.expression> <symbol> <low.expression> and <high.expression>`. */
  __defaultSerialize(ctx: SerializeContext, o: any) {
    return (
      o.left.expression +
      ' ' +
      o.symbol +
      ' ' +
      o.right[0].expression +
      ' and ' +
      o.right[1].expression
    );
  }
}

interface BetweenCtor {
  new (left: string | SqlElement, right: any[] | SqlElement): Between;
  new (left: string | SqlElement, right1: any, right2: any): Between;
  (left: string | SqlElement, right: any[] | SqlElement): Between;
  (left: string | SqlElement, right1: any, right2: any): Between;
  prototype: Between;
}

/**
 * Creates a `BETWEEN low AND high` range comparison. Callable with or
 * without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right1 - Either a two-element `[low, high]` array, or the range's low bound (paired with `right2`).
 * @param right2 - The range's high bound, when `right1` is the low bound rather than a `[low, high]` array; defaults to `right1` if omitted.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const Between = function (
  this: Between,
  left: string | SqlElement,
  right1: any,
  right2: any,
) {
  const right = Array.isArray(right1) ? right1 : [right1, right2];
  if (!(this instanceof Between)) return new Between(left, right);
  if (right && right[1] == null) right[1] = right[0];
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.between;
  this._symbol = 'between';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as BetweenCtor;

Between.prototype = BetweenClass.prototype;
Between.prototype.constructor = Between;

export interface Between extends BetweenClass {}
