import type { SerializationType } from './enums.js';
import type { SerializeContext } from './serialize-context.js';

export interface SqlElement {
  _type: SerializationType;

  /**
   * Performs serialization
   */
  _serialize(ctx: SerializeContext): string;
}

interface SqlElementCtor {
  new (): SqlElement;
  (): SqlElement;
  prototype: SqlElement;
}

export const SqlElement = function (this: SqlElement) {
  if (!this) return new SqlElement();
  if (this.constructor === SqlElement) {
    throw new TypeError('SqlElement is abstract and cannot be instantiated');
  }
} as SqlElementCtor;

/* Backward compatibility */
export const Serializable = SqlElement;
export type Serializable = SqlElement;
