import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * A `MIN(expr)` aggregate expression. Construct via the exported
 * {@link Min} factory rather than this class directly.
 */
class MinClass extends SqlElement {
  _expression: any;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.MIN_STATEMENT;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `min(expr)`, or an empty string if no expression was given.
   */
  _serialize(ctx: SerializeContext): string {
    if (!this._expression) return '';
    const q = ctx.anyToSQL(this._expression);

    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return 'min(' + o + ')' + (this._alias ? ' ' + this._alias : '');
  }
}

interface MinCtor {
  new (expression: any): Min;
  (expression: any): Min;
  prototype: Min;
}

/**
 * Creates a `MIN(...)` aggregate expression. Callable with or without `new`.
 *
 * @param expression - The column/expression to aggregate; converted via `ctx.anyToSQL(...)`.
 */
export const Min = function (this: Min, expression: any) {
  if (!(this instanceof Min)) return new Min(expression);
  SqlElement.call(this);
  this._expression = expression;
} as MinCtor;

Min.prototype = MinClass.prototype;
Min.prototype.constructor = Min;

export interface Min extends MinClass {}
