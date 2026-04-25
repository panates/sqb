import { OperatorType } from '../../enums.js';
import { LogicalOperator } from './logical-operator.js';

class OrClass extends LogicalOperator {}

interface OrCtor {
  new (...items: any[]): Or;
  (...items: any[]): Or;
  prototype: Or;
}

export const Or = function (this: Or, ...items: any[]) {
  if (!(this instanceof Or)) return new Or(...items);
  LogicalOperator.call(this, ...items);
  this._operatorType = OperatorType.or;
} as OrCtor;

Or.prototype = OrClass.prototype;
Or.prototype.constructor = Or;

export interface Or extends OrClass {}
