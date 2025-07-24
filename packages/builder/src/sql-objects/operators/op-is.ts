import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

export class OpIs extends CompOperator {
  _operatorType = OperatorType.is;
  _symbol = 'is';

  constructor(left: string | Serializable, right?: any) {
    super(left, right);
  }
}
