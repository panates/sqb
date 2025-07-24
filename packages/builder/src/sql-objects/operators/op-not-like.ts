import { OperatorType } from '../../enums.js';
import { OpLike } from './op-like.js';

export class OpNotLike extends OpLike {
  _operatorType = OperatorType.notLike;
  _symbol = 'not like';
}
