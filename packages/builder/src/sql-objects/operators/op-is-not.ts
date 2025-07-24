import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

export class OpIsNot extends CompOperator {
  _operatorType = OperatorType.isNot;
  _symbol = 'is not';

  constructor(left: string | Serializable, right?: any) {
    super(left, right);
  }
}
