import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class SequenceClass extends SqlElement {
  _expression!: string;
  _next!: boolean;
  _alias?: string;

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

interface SequenceCtor {
  new (expression: string, next?: boolean): Sequence;
  (expression: string, next?: boolean): Sequence;
  prototype: Sequence;
}

export const Sequence = function (
  this: Sequence,
  expression: string,
  next?: boolean,
) {
  if (!(this instanceof Sequence)) return new Sequence(expression, next);
  SqlElement.call(this);
  this._expression = expression;
  this._next = !!next;
} as SequenceCtor;

Sequence.prototype = SequenceClass.prototype;
Sequence.prototype.constructor = Sequence;

export interface Sequence extends SequenceClass {}
