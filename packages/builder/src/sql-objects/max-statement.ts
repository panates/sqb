import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';

export class MaxStatement extends Serializable {
  _expression: any;
  _alias?: string;

  constructor(expression: any) {
    super();
    this._expression = expression;
  }

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
