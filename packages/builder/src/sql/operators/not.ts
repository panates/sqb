import { OperatorType, SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { Operator } from '../operators/operator.js';

/**
 * A `NOT (expression)` negation, wrapping an arbitrary condition rather than
 * being a fixed comparison like {@link CompOperator}'s subclasses.
 * Construct via the exported {@link Not} factory rather than this class
 * directly.
 */
class NotClass extends Operator {
  declare _expression: SqlElement;

  get _type(): SerializationType {
    return SerializationType.NEGATIVE_EXPRESSION;
  }

  /** Serializes as `not <expression>`, or an empty string if the wrapped expression serialized to nothing. */
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

/**
 * Creates a `NOT (expression)` negation. Callable with or without `new`.
 *
 * @param expression - The condition to negate.
 */
export const Not = function (this: Not, expression: SqlElement) {
  if (!(this instanceof Not)) return new Not(expression);
  Operator.call(this);
  this._operatorType = OperatorType.not;
  this._expression = expression;
} as NotCtor;

Not.prototype = NotClass.prototype;
Not.prototype.constructor = Not;

export interface Not extends NotClass {}
