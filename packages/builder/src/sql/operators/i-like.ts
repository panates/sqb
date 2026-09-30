import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';
import { Like } from './like.js';

/** A case-insensitive `ILIKE` pattern-match comparison. Construct via the exported {@link ILike} factory rather than this class directly. */
class ILikeClass extends Like {}

interface ILikeCtor {
  new (left: string | SqlElement, right?: string | SqlElement): ILike;
  (left: string | SqlElement, right?: string | SqlElement): ILike;
  prototype: ILike;
}

/**
 * Creates a case-insensitive `ILIKE` pattern-match comparison
 * (`left ilike right`). Callable with or without `new`.
 *
 * `ILIKE` isn't standard SQL (it's a Postgres extension) - dialects without
 * native support for it should provide a `SerializerExtension` to emit an
 * equivalent (e.g. wrapping both sides in `LOWER(...)`).
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The pattern to match against, or a {@link SqlElement}.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const ILike = function (
  this: ILike,
  left: string | SqlElement,
  right?: string | SqlElement,
) {
  if (!(this instanceof ILike)) return new ILike(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.iLike;
  this._symbol = 'ilike';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as ILikeCtor;

ILike.prototype = ILikeClass.prototype;
ILike.prototype.constructor = ILike;

export interface ILike extends ILikeClass {}
