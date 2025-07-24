import { OperatorType } from '../../enums.js';
import { LogicalOperator } from './logical-operator.js';

export class OpOr extends LogicalOperator {
  _operatorType = OperatorType.or;
}
