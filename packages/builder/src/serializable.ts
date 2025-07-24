import type { SerializationType } from './enums.js';
import type { SerializeContext } from './serialize-context.js';

export abstract class Serializable {
  abstract _type: SerializationType;

  /**
   * Performs serialization
   */
  abstract _serialize(ctx: SerializeContext): string;
}
