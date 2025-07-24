import { OperatorType } from '../../enums.js';
import { OpILike } from './op-ilike.js';

export class OpNotILike extends OpILike {
  _operatorType = OperatorType.notILike;
  _symbol = 'not ilike';
}
