import { OperatorType } from '../../enums.js';
import { OpIn } from './op-in.js';

export class OpNotIn extends OpIn {
  _operatorType = OperatorType.notIn;
  _symbol = 'not in';
}
