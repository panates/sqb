import type { SerializationType } from './enums.js';
import type { SerializeContext } from './serialize-context.js';

export interface Serializable {
  _type: SerializationType;

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string;
}

interface SerializableCtor {
  new (): Serializable;
  (): Serializable;
  prototype: Serializable;
}

export const Serializable = function (this: Serializable) {
  if (!this) return new Serializable();
  if (this.constructor === Serializable) {
    throw new TypeError('Serializable is abstract and cannot be instantiated');
  }
} as SerializableCtor;
