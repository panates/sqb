import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';

export interface Operator extends Serializable {
  _operatorType: OperatorType;
}

interface OperatorCtor {
  new (): Operator;
  (): Operator;
  prototype: Operator;
}

export const Operator = function (this: Operator) {
  if (!(this instanceof Operator)) return new Operator();
  if (this.constructor === Operator) {
    throw new TypeError('Operator is abstract and cannot be instantiated');
  }
  Serializable.call(this);
} as OperatorCtor;

Operator.prototype = Object.create(Serializable.prototype);
Operator.prototype.constructor = Operator;
