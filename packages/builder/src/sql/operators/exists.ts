import { OperatorType } from '../../enums.js';
import { SerializeContext } from '../../serialize-context.js';
import { isRaw, isSelect } from '../../type-guards.js';
import type { Raw } from '../elements/index.js';
import type { Select } from '../select.js';
import { CompOperator } from './comp-operator.js';

/**
 * An `EXISTS (subquery)` comparison (a single-operand check, unlike most
 * `CompOperator` subclasses). Construct via the exported {@link Exists}
 * factory rather than this class directly.
 */
class ExistsClass extends CompOperator {
  /** Serializes as `exists <subquery>`, or an empty string if the sub-query serialized to nothing. */
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

  /** Default fallback: `<symbol> <left.expression>`. */
  __defaultSerialize(ctx: SerializeContext, o: any) {
    return o.left.expression ? o.symbol + ' ' + o.left.expression : '';
  }
}

interface ExistsCtor {
  new (query: Select | Raw): Exists;
  (query: Select | Raw): Exists;
  prototype: Exists;
}

/**
 * Creates an `EXISTS (subquery)` comparison. Callable with or without `new`.
 *
 * @param query - The sub-query (or {@link Raw} expression) to check for row existence.
 * @throws {TypeError} If `query` isn't a `Select` or `Raw`.
 */
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
