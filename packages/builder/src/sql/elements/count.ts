import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * A `COUNT(*)` expression. Construct via the exported {@link Count} factory
 * rather than this class directly.
 */
class CountClass extends SqlElement {
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.COUNT_STATEMENT;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `count(*)`.
   */
  _serialize(ctx: SerializeContext): string {
    return ctx.serialize(this._type, undefined, () =>
      this.__defaultSerialize(ctx, undefined),
    );
  }

  // noinspection JSUnusedLocalSymbols
  protected __defaultSerialize(
    /* eslint-disable-next-line */
    ctx: SerializeContext,
    /* eslint-disable-next-line */
    o: any,
  ): string {
    return 'count(*)';
  }
}

interface CountCtor {
  new (): Count;
  (): Count;
  prototype: Count;
}

/**
 * Creates a `COUNT(*)` expression. Callable with or without `new`.
 */
export const Count = function (this: Count) {
  if (!(this instanceof Count)) return new Count();
  SqlElement.call(this);
} as CountCtor;

Count.prototype = CountClass.prototype;
Count.prototype.constructor = Count;

export interface Count extends CountClass {}
