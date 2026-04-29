import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class LowerClass extends SqlElement {
  _expression: any;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.LOWER_STATEMENT;
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
    return 'lower(' + o + ')' + (this._alias ? ' ' + this._alias : '');
  }
}

interface LowerCtor {
  new (expression: any): Lower;
  (expression: any): Lower;
  prototype: Lower;
}

export const Lower = function (this: Lower, expression: any) {
  if (!(this instanceof Lower)) return new Lower(expression);
  SqlElement.call(this);
  this._expression = expression;
} as LowerCtor;

Lower.prototype = LowerClass.prototype;
Lower.prototype.constructor = Lower;

export interface Lower extends LowerClass {}
