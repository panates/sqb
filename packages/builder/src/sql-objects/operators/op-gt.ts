import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

export class OpGt extends CompOperator {
  _operatorType = OperatorType.gt;
  _symbol = '>';

  constructor(left: string | Serializable, right?: any) {
    super(left, right);
  }
}
