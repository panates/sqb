import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';

export class CoalesceStatement extends Serializable {
  _expressions: any[];
  _alias?: string;

  constructor(...expressions: any[]) {
    super();
    this._expressions = expressions;
  }

  get _type(): SerializationType {
    return SerializationType.COALESCE_STATEMENT;
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
