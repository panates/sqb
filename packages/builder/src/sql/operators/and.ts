import { OperatorType } from '../../enums.js';
import { LogicalOperator } from './logical-operator.js';

/** Combines its conditions with `AND`. Construct via the exported {@link And} factory rather than this class directly. */
class AndClass extends LogicalOperator {
  _operatorType = OperatorType.and;
}

interface AndCtor {
  new (...items: any[]): And;
  (...items: any[]): And;
  prototype: And;
}

/**
 * Creates an `AND`-combined group of conditions. Callable with or without
 * `new`. This is also what `.where(...)` on a query builder uses
 * internally to combine multiple condition arguments.
 *
 * @param items - Conditions to combine, same accepted forms as {@link LogicalOperator.add}.
 */
export const And = function (this: And, ...items: any[]) {
  if (!(this instanceof And)) return new And(...items);
  LogicalOperator.call(this, ...items);
  this._operatorType = OperatorType.and;
} as AndCtor;

And.prototype = AndClass.prototype;
And.prototype.constructor = And;

export interface And extends AndClass {}
