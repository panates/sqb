import { OperatorType } from '../../enums.js';
import { SerializeContext } from '../../serialize-context.js';
import { isRaw, isSelect } from '../../type-guards.js';
import type { Raw } from '../elements/index.js';
import type { Select } from '../select.js';
import { CompOperator } from './comp-operator.js';

class ExistsClass extends CompOperator {
  _serialize(ctx: SerializeContext): string {
    const left = this.__serializeItem(ctx, this._left);
    if (this._isArray) left.isArray = true;
    const o: any = {
      operatorType: this._operatorType,
      symbol: this._symbol,
      left,
    };
    return this.__serialize(ctx, o);
  }

  __defaultSerialize(ctx: SerializeContext, o: any) {
    return o.left.expression ? o.symbol + ' ' + o.left.expression : '';
  }
}

interface ExistsCtor {
  new (query: Select | Raw): Exists;
  (query: Select | Raw): Exists;
  prototype: Exists;
}

export const Exists = function (this: Exists, query: Select | Raw) {
  if (!(this instanceof Exists)) return new Exists(query);
  CompOperator.call(this, query);
  this._operatorType = OperatorType.exists;
  this._symbol = 'exists';
  if (!(typeof query === 'object' && (isSelect(query) || isRaw(query)))) {
    throw new TypeError('You must provide a Select or Raw in `exists()`');
  }
} as ExistsCtor;

Exists.prototype = ExistsClass.prototype;
Exists.prototype.constructor = Exists;

export interface Exists extends ExistsClass {}
