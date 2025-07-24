import { OperatorType } from '../../enums.js';
import { LogicalOperator } from './logical-operator.js';

export class OpAnd extends LogicalOperator {
  _operatorType = OperatorType.and;
}
