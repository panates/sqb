import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class CoalesceClass extends SqlElement {
  _expressions!: any[];
  _alias?: string;

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

interface CoalesceCtor {
  new (...expressions: any[]): Coalesce;
  (...expressions: any[]): Coalesce;
  prototype: Coalesce;
}

export const Coalesce = function (this: Coalesce, ...expressions: any[]) {
  if (!(this instanceof Coalesce)) return new Coalesce(...expressions);
  SqlElement.call(this);
  this._expressions = expressions;
} as CoalesceCtor;

Coalesce.prototype = CoalesceClass.prototype;
Coalesce.prototype.constructor = Coalesce;

export interface Coalesce extends CoalesceClass {}
