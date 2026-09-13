import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * A sequence getter expression: `currval('name')` (the sequence's current
 * value), or `nextval('name')` when `.next(true)` is set (advances the
 * sequence and returns its new value). Construct via the exported
 * {@link Sequence} factory rather than this class directly.
 */
class SequenceClass extends SqlElement {
  _expression!: string;
  _next!: boolean;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.SEQUENCE_GETTER_STATEMENT;
  }

  /**
   * Selects between `nextval` (`true`, advances the sequence) and `currval`
   * (`false`, reads without advancing).
   */
  next(value: boolean): this {
    this._next = value;
    return this;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `nextval('name')`/`currval('name')`, or an empty string
   * if no sequence name was given.
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

/**
 * Creates a sequence getter expression. Callable with or without `new`.
 *
 * @param expression - The sequence name.
 * @param next - `true` for `nextval(...)`; omitted/`false` for `currval(...)`.
 */
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
