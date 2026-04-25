import { OperatorType } from '../../enums.js';
import { LogicalOperator } from './logical-operator.js';

class AndClass extends LogicalOperator {
  _operatorType = OperatorType.and;
}

interface AndCtor {
  new (...items: any[]): And;
  (...items: any[]): And;
  prototype: And;
}

export const And = function (this: And, ...items: any[]) {
  if (!(this instanceof And)) return new And(...items);
  LogicalOperator.call(this, ...items);
  this._operatorType = OperatorType.and;
} as AndCtor;

And.prototype = AndClass.prototype;
And.prototype.constructor = And;

export interface And extends AndClass {}
