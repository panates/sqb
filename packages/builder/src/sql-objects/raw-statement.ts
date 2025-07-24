import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';

export class RawStatement extends Serializable {
  _text: string;

  constructor(str: string) {
    super();
    this._text = str;
  }

  get _type(): SerializationType {
    return SerializationType.RAW;
  }

  _serialize(ctx: SerializeContext): string {
    return ctx.serialize(this._type, this._text, () => this._text);
  }
}
