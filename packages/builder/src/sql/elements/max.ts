import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class MaxClass extends SqlElement {
  _expression: any;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.MAX_STATEMENT;
  }

  /**
   * Sets alias to case expression.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Performs serialization
   *
   * @param {Object} ctx
   * @return {string}
   * @override
   */
  _serialize(ctx: SerializeContext): string {
    if (!this._expression) return '';
    const q = ctx.anyToSQL(this._expression);

    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return 'max(' + o + ')' + (this._alias ? ' ' + this._alias : '');
  }
}

interface MaxCtor {
  new (expression: any): Max;
  (expression: any): Max;
  prototype: Max;
}

export const Max = function (this: Max, expression: any) {
  if (!(this instanceof Max)) return new Max(expression);
  SqlElement.call(this);
  this._expression = expression;
} as MaxCtor;

Max.prototype = MaxClass.prototype;
Max.prototype.constructor = Max;

export interface Max extends MaxClass {}
