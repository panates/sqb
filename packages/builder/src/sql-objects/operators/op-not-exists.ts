import { OperatorType } from '../../enums.js';
import { OpExists } from './op-exists.js';

export class OpNotExists extends OpExists {
  _operatorType = OperatorType.notExists;
  _symbol = 'not exists';
}
