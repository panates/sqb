import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * A `COALESCE(expr1, expr2, ...)` expression, returning the first non-null
 * argument. Construct via the exported {@link Coalesce} factory rather than
 * this class directly.
 */
class CoalesceClass extends SqlElement {
  _expressions!: any[];
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.COALESCE_STATEMENT;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `coalesce(expr1, expr2, ...)`, or an empty string if no
   * expressions were given.
   */
  _serialize(ctx: SerializeContext): string {
    if (!this._expressions.length) return '';
    const q = {
      expressions: [] as any[],
    };
    for (const x of this._expressions) {
      q.expressions.push(ctx.anyToSQL(x));
    }

    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return (
      'coalesce(' +
      o.expressions.join(', ') +
      ')' +
      (this._alias ? ' ' + this._alias : '')
    );
  }
}

interface CoalesceCtor {
  new (...expressions: any[]): Coalesce;
  (...expressions: any[]): Coalesce;
  prototype: Coalesce;
}

/**
 * Creates a `COALESCE(...)` expression. Callable with or without `new`.
 *
 * @param expressions - The candidate expressions/values, in order; each is converted via `ctx.anyToSQL(...)`.
 */
export const Coalesce = function (this: Coalesce, ...expressions: any[]) {
  if (!(this instanceof Coalesce)) return new Coalesce(...expressions);
  SqlElement.call(this);
  this._expressions = expressions;
} as CoalesceCtor;

Coalesce.prototype = CoalesceClass.prototype;
Coalesce.prototype.constructor = Coalesce;

export interface Coalesce extends CoalesceClass {}
