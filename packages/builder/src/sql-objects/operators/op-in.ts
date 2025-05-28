import { OperatorType } from '../../enums.js';
import { SerializeContext } from '../../serialize-context.js';
import { isSerializable } from '../../typeguards.js';
import { CompOperator } from './comp-operator.js';

export class OpIn extends CompOperator {
  _operatorType = OperatorType.in;
  _symbol = 'in';

  constructor(left, right) {
    super(
      left,
      Array.isArray(right) || isSerializable(right) ? right : [right],
    );
  }

  _serialize(ctx: SerializeContext): string {
    if (Array.isArray(this._right) && !this._right.length) return '';
    return super._serialize(ctx);
  }
}
