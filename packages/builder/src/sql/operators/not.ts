import { OperatorType, SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Operator } from '../operators/operator.js';

class NotClass extends Operator {
  declare _expression: SqlElement;

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

interface NotCtor {
  new (expression: SqlElement): Not;
  (expression: SqlElement): Not;
  prototype: Not;
}

export const Not = function (this: Not, expression: SqlElement) {
  if (!(this instanceof Not)) return new Not(expression);
  Operator.call(this);
  this._operatorType = OperatorType.not;
  this._expression = expression;
} as NotCtor;

Not.prototype = NotClass.prototype;
Not.prototype.constructor = Not;

export interface Not extends NotClass {}
