import { OperatorType } from '../../enums.js';
import { OpLike } from './op-like.js';

export class OpILike extends OpLike {
  _operatorType = OperatorType.iLike;
  _symbol = 'ilike';
}
