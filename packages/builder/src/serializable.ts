import type { SerializationType } from './enums.js';
import type { SerializeContext } from './serialize-context.js';

/**
 * Base contract implemented by every query/column/operator/expression object
 * in this package (queries, `sql.*` elements, and operators alike). Anything
 * that can turn itself into a SQL fragment is a `SqlElement` - this is what
 * {@link isSqlElement} and friends in `type-guards.ts` check for.
 */
export interface SqlElement {
  /** Discriminates the concrete kind of element, used for type guards and to key dialect serialization overrides. */
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

/**
 * Abstract root of the `SqlElement` hierarchy. Every concrete element
 * (`Query` and its subclasses, `Operator` and its subclasses, and every
 * `sql.*` element) ultimately derives its prototype from this function.
 *
 * `SqlElement` itself is abstract: constructing it directly (rather than
 * through a concrete subclass) throws.
 *
 * @throws {TypeError} If instantiated directly rather than through a subclass.
 */
export const SqlElement = function (this: SqlElement) {
  if (!this) return new SqlElement();
  if (this.constructor === SqlElement) {
    throw new TypeError('SqlElement is abstract and cannot be instantiated');
  }
} as SqlElementCtor;

/* Backward compatibility */
export const Serializable = SqlElement;
export type Serializable = SqlElement;
