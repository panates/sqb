import { OperatorType } from '../../enums.js';
import { OpBetween } from './op-between.js';

export class OpNotBetween extends OpBetween {
  _operatorType = OperatorType.notBetween;
  _symbol = 'not between';
}
