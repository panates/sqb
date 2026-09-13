import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

/**
 * An escape hatch that emits `_text` verbatim into the generated SQL,
 * unparsed and unescaped. Useful for expressions the fluent builder doesn't
 * (yet) model. Construct via the exported {@link Raw} factory rather than
 * this class directly.
 */
class RawClass extends SqlElement {
  _text!: string;

  get _type(): SerializationType {
    return SerializationType.RAW;
  }

  /** Serializes as the raw text, unchanged. */
  _serialize(ctx: SerializeContext): string {
    return ctx.serialize(this._type, this._text, () => this._text);
  }
}

interface RawCtor {
  new (str: string): Raw;
  (str: string): Raw;
  prototype: Raw;
}

/**
 * Creates a raw, verbatim SQL fragment. Callable with or without `new`.
 *
 * Since `str` is emitted unescaped, never build it from untrusted input
 * without your own sanitization/parameterization.
 *
 * @param str - The literal SQL text to emit.
 */
export const Raw = function (this: Raw, str: string) {
  if (!(this instanceof Raw)) return new Raw(str);
  SqlElement.call(this);
  this._text = str;
} as RawCtor;

Raw.prototype = RawClass.prototype;
Raw.prototype.constructor = Raw;

export interface Raw extends RawClass {}
