import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { CompOperator } from './comp-operator.js';

export class OpLt extends CompOperator {
  _operatorType = OperatorType.lt;
  _symbol = '<';

  constructor(left: string | Serializable, right?: any) {
    super(left, right);
  }
}
