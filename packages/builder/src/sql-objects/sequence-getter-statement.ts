import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';

export class SequenceGetterStatement extends Serializable {
  _expression: string;
  _next: boolean;
  _alias?: string;

  constructor(expression: string, next?: boolean) {
    super();
    this._expression = expression;
    this._next = !!next;
  }

  get _type(): SerializationType {
    return SerializationType.SEQUENCE_GETTER_STATEMENT;
  }

  next(value: boolean): this {
    this._next = value;
    return this;
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

    const q = {
      genName: this._expression,
      next: this._next,
      alias: this._alias,
    };
    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    return (
      (o.next ? 'nextval' : 'currval') +
      "('" +
      o.genName +
      "')" +
      (o.alias ? ' ' + o.alias : '')
    );
  }
}
