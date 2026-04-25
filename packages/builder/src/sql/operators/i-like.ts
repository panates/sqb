import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';
import { Like } from './like.js';

class ILikeClass extends Like {}

interface ILikeCtor {
  new (left: string | Serializable, right?: string | Serializable): ILike;
  (left: string | Serializable, right?: string | Serializable): ILike;
  prototype: ILike;
}

export const ILike = function (
  this: ILike,
  left: string | Serializable,
  right?: string | Serializable,
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
