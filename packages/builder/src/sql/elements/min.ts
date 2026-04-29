import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class MinClass extends SqlElement {
  _expression: any;
  _alias?: string;

  constructor(expression: any) {
    super();
    this._expression = expression;
  }

  get _type(): SerializationType {
    return SerializationType.MIN_STATEMENT;
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
    return 'min(' + o + ')' + (this._alias ? ' ' + this._alias : '');
  }
}

interface MinCtor {
  new (expression: any): Min;
  (expression: any): Min;
  prototype: Min;
}

export const Min = function (this: Min, expression: any) {
  if (!(this instanceof Min)) return new Min(expression);
  this._expression = expression;
} as MinCtor;

Min.prototype = MinClass.prototype;
Min.prototype.constructor = Min;

export interface Min extends MinClass {}
