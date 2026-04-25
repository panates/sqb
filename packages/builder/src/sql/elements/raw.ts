import { SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';

class RawClass extends Serializable {
  _text!: string;

  get _type(): SerializationType {
    return SerializationType.RAW;
  }

  _serialize(ctx: SerializeContext): string {
    return ctx.serialize(this._type, this._text, () => this._text);
  }
}

interface RawCtor {
  new (str: string): Raw;
  (str: string): Raw;
  prototype: Raw;
}

export const Raw = function (this: Raw, str: string) {
  if (!(this instanceof Raw)) return new Raw(str);
  Serializable.call(this);
  this._text = str;
} as RawCtor;

Raw.prototype = RawClass.prototype;
Raw.prototype.constructor = Raw;

export interface Raw extends RawClass {}
