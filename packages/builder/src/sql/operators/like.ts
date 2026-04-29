import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { CompOperator } from './comp-operator.js';

class LikeClass extends CompOperator {
  __serialize(ctx: SerializeContext, o: any): string {
    if (!o.right.expression) return '';
    if (o.right && typeof o.right.expression !== 'string')
      o.right.expression = String(o.right.expression);
    return ctx.serialize(this._type, o, (_ctx: SerializeContext, _o) =>
      this.__defaultSerialize(_ctx, _o),
    );
  }
}

interface LikeCtor {
  new (left: string | SqlElement, right?: string | SqlElement): Like;
  (left: string | SqlElement, right?: string | SqlElement): Like;
  prototype: Like;
}

export const Like = function (
  this: Like,
  left: string | SqlElement,
  right?: string | SqlElement,
) {
  if (!(this instanceof Like)) return new Like(left, right);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.like;
  this._symbol = 'like';
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as LikeCtor;

Like.prototype = LikeClass.prototype;
Like.prototype.constructor = Like;

export interface Like extends LikeClass {}
