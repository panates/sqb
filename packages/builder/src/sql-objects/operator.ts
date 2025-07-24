import { OperatorType } from '../enums.js';
import { Serializable } from '../serializable.js';

export abstract class Operator extends Serializable {
  abstract _operatorType: OperatorType;
}
