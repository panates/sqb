import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';

/**
 * Base contract for every comparison/logical operator element
 * ({@link CompOperator}'s and {@link LogicalOperator}'s subclasses, and
 * {@link Not}), used in `WHERE`/`ON`/`HAVING`/`CASE WHEN` conditions.
 */
export interface Operator extends SqlElement {
  /** Which concrete operator this is (e.g. `eq`, `gt`, `and`) - see {@link OperatorType}. */
  _operatorType: OperatorType;
}

interface OperatorCtor {
  new (): Operator;
  (): Operator;
  prototype: Operator;
}

/**
 * Abstract constructor for operator elements. Not meant to be constructed
 * directly - use a concrete operator such as {@link Eq}, {@link And}, or
 * {@link Not}.
 *
 * @throws {TypeError} If instantiated directly rather than through a subclass.
 */
export const Operator = function (this: Operator) {
  if (!(this instanceof Operator)) return new Operator();
  if (this.constructor === Operator) {
    throw new TypeError('Operator is abstract and cannot be instantiated');
  }
  SqlElement.call(this);
} as OperatorCtor;

Operator.prototype = Object.create(SqlElement.prototype);
Operator.prototype.constructor = Operator;
