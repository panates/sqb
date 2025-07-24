import { OperatorType, SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Operator } from '../operator.js';

export class OpNot extends Operator {
  _operatorType = OperatorType.not;
  _expression: Serializable;

  constructor(expression: Serializable) {
    super();
    this._expression = expression;
  }

  get _type(): SerializationType {
    return SerializationType.NEGATIVE_EXPRESSION;
  }

  _serialize(ctx: SerializeContext): string {
    const expression: string = ctx.anyToSQL(this._expression);
    return ctx.serialize(this._type, expression, () =>
      expression ? 'not ' + expression : '',
    );
  }
}
