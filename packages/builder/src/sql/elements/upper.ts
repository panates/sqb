import { SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class UpperClass extends Serializable {
  _expression: any;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.UPPER_STATEMENT;
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
    return 'upper(' + o + ')' + (this._alias ? ' ' + this._alias : '');
  }
}

interface UpperCtor {
  new (expression: any): Upper;
  (expression: any): Upper;
  prototype: Upper;
}

export const Upper = function (this: Upper, expression: any) {
  if (!(this instanceof Upper)) return new Upper(expression);
  Serializable.call(this);
  this._expression = expression;
} as UpperCtor;

Upper.prototype = UpperClass.prototype;
Upper.prototype.constructor = Upper;

export interface Upper extends UpperClass {}
