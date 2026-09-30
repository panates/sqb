import { OperatorType } from '../../enums.js';
import { LogicalOperator } from './logical-operator.js';

/** Combines its conditions with `OR`. Construct via the exported {@link Or} factory rather than this class directly. */
class OrClass extends LogicalOperator {}

interface OrCtor {
  new (...items: any[]): Or;
  (...items: any[]): Or;
  prototype: Or;
}

/**
 * Creates an `OR`-combined group of conditions. Callable with or without
 * `new`.
 *
 * @param items - Conditions to combine, same accepted forms as {@link LogicalOperator.add}.
 */
export const Or = function (this: Or, ...items: any[]) {
  if (!(this instanceof Or)) return new Or(...items);
  LogicalOperator.call(this, ...items);
  this._operatorType = OperatorType.or;
} as OrCtor;

Or.prototype = OrClass.prototype;
Or.prototype.constructor = Or;

export interface Or extends OrClass {}
