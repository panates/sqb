import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * An `UPPER(expr)` expression. Construct via the exported {@link Upper}
 * factory rather than this class directly.
 */
class UpperClass extends SqlElement {
  _expression: any;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.UPPER_STATEMENT;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `upper(expr)`, or an empty string if no expression was given.
   */
  _serialize(ctx: SerializeContext): string {
    if (!this._expression) return '';
    const q = ctx.anyToSQL(this._expression);
    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return 'upper(' + o + ')' + (this._alias ? ' ' + this._alias : '');
  }
}

interface UpperCtor {
  new (expression: any): Upper;
  (expression: any): Upper;
  prototype: Upper;
}

/**
 * Creates an `UPPER(...)` expression. Callable with or without `new`.
 *
 * @param expression - The column/expression to uppercase; converted via `ctx.anyToSQL(...)`.
 */
export const Upper = function (this: Upper, expression: any) {
  if (!(this instanceof Upper)) return new Upper(expression);
  SqlElement.call(this);
  this._expression = expression;
} as UpperCtor;

Upper.prototype = UpperClass.prototype;
Upper.prototype.constructor = Upper;

export interface Upper extends UpperClass {}
