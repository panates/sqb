import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { CompOperator } from './comp-operator.js';

/**
 * A dialect-defined full-text/pattern match comparison. Has no
 * standard-SQL meaning on its own (serializes as `=` by default via
 * `_symbol`) - a dialect extension is expected to override its
 * serialization (e.g. into a full-text search predicate), using
 * `customArgs` for any dialect-specific configuration it needs. Construct
 * via the exported {@link Match} factory rather than this class directly.
 */
class MatchClass extends CompOperator {
  /** Dialect-specific extra arguments consulted by a `SerializerExtension` overriding this operator's serialization. */
  customArgs?: any;

  /** Serializes as `<left> = <right>` by default; expected to be overridden per dialect. Serializes to an empty string if the pattern is empty. */
  __serialize(ctx: SerializeContext, o: any): string {
    if (!o.right.expression) return '';
    if (o.right && typeof o.right.expression !== 'string')
      o.right.expression = String(o.right.expression);
    o.customArgs = this.customArgs;
    return ctx.serialize(this._type, o, (_ctx: SerializeContext, _o) =>
      this.__defaultSerialize(_ctx, _o),
    );
  }
}

interface MatchCtor {
  new (
    left: string | SqlElement,
    right?: string | SqlElement,
    customArgs?: any,
  ): Match;
  (
    left: string | SqlElement,
    right?: string | SqlElement,
    customArgs?: any,
  ): Match;
  prototype: Match;
}

/**
 * Creates a dialect-defined match comparison, intended to be given
 * dialect-specific meaning (e.g. full-text search) by a
 * `SerializerExtension`. Callable with or without `new`.
 *
 * @param left - A `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The value/pattern to match against, or a {@link SqlElement}.
 * @param customArgs - Extra dialect-specific configuration, read by the dialect's serializer override.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const Match = function (
  this: Match,
  left: string | SqlElement,
  right?: string | SqlElement,
  customArgs?: any,
) {
  if (!(this instanceof Match)) return new Match(left, right, customArgs);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.match;
  this._symbol = '=';
  this.customArgs = customArgs;
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as MatchCtor;

Match.prototype = MatchClass.prototype;
Match.prototype.constructor = Match;

export interface Match extends MatchClass {}
