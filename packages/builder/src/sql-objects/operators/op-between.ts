import { OperatorType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { CompOperator } from './comp-operator.js';

export class OpBetween extends CompOperator {
  _operatorType = OperatorType.between;
  _symbol = 'between';

  constructor(left: string | Serializable, right: any[]) {
    super(left, right);
    if (right && right[1] == null) right[1] = right[0];
  }

  _serialize(ctx: SerializeContext): string {
    if (!(this._right && this._right.length > 0)) return '';
    const left = this.__serializeItem(ctx, this._left);
    const right = [
      this.__serializeItem(ctx, this._right[0], true),
      this.__serializeItem(ctx, this._right[1], true),
    ];
    const o: any = {
      operatorType: this._operatorType,
      symbol: this._symbol,
      left,
      right,
    };
    return this.__serialize(ctx, o);
  }

  __defaultSerialize(ctx, o) {
    return (
      o.left.expression +
      ' ' +
      o.symbol +
      ' ' +
      o.right[0].expression +
      ' and ' +
      o.right[1].expression
    );
  }
}
