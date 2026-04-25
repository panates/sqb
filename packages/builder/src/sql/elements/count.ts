import { SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class CountClass extends Serializable {
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.COUNT_STATEMENT;
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

export const Count = function (this: Count) {
  if (!(this instanceof Count)) return new Count();
  Serializable.call(this);
} as CountCtor;

Count.prototype = CountClass.prototype;
Count.prototype.constructor = Count;

export interface Count extends CountClass {}
