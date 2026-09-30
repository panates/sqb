import isPlainObject from 'putil-isplainobject';
import { SerializationType } from '../../enums.js';
import { printArray } from '../../helpers.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import {
  isCompOperator,
  isLogicalOperator,
  isNot,
  isRaw,
} from '../../type-guards.js';
import { Operator } from './operator.js';

// noinspection RegExpUnnecessaryNonCapturingGroup
const COMPARE_LEFT_PATTERN = /^([\w\\.$]+(?:\[])?) *(.*)$/;

/**
 * Abstract base for `AND`/`OR` operators ({@link And}, {@link Or}),
 * combining a list of conditions with its operator's keyword. Construct via
 * a concrete subclass rather than this class directly.
 *
 * Beyond {@link Operator}/{@link Raw} instances, `.add(...)` also accepts a
 * plain object condition (e.g. `{ age: { gt: 18 }, name: 'John' }`), which
 * is expanded into one operator per own-property via {@link OperatorsMap}:
 * a nested object/array value picks the operator from its own key(s) (or
 * `'and'`/`'or'` for `{ and: [...] }`/`{ or: [...] }`), a bare array value
 * picks `in`, and anything else picks `eq`.
 */
export interface LogicalOperator extends Operator {
  /** The condition elements combined by this operator, in the order added. */
  _items: SqlElement[];

  /**
   * Adds one or more conditions.
   *
   * @param expressions - {@link Operator}/{@link Raw} instances, nested `LogicalOperator`s, or plain object conditions.
   * @throws {TypeError} If an argument isn't an `Operator`, `Raw`, `LogicalOperator`, or plain object; or if an object condition's key isn't a recognized operator/expression format.
   */
  add(...expressions: (LogicalOperator | any)[]): this;
  _serialize(ctx: SerializeContext): string;
}

interface LogicalOperatorCtor {
  new (...expressions: any[]): LogicalOperator;
  (...expressions: any[]): LogicalOperator;
  prototype: LogicalOperator;
}

/**
 * Expands a plain object condition (e.g. `{ age: { gt: 18 } }`) into one
 * operator instance per own-property, resolving each key against the
 * operator table attached to `LogicalOperator` (see `op.ns.ts`).
 *
 * @throws {Error} If a key resolves to an unknown operator.
 * @throws {TypeError} If a key isn't a recognized operator/expression format.
 */
function wrapObject(obj: any): SqlElement[] {
  const registeredOperators = (LogicalOperator as any).Operators;
  const result: SqlElement[] = [];
  for (const n of Object.getOwnPropertyNames(obj)) {
    let fn: Function;
    const v = obj[n];
    if (['and', 'or'].includes(n.toLowerCase())) {
      fn = registeredOperators[n.toLowerCase()];
      if (!fn) throw new Error(`Unknown operator "${n}"`);
      result.push(Array.isArray(v) ? fn(...v) : fn(v));
      continue;
    }
    if (['exists', '!exists'].includes(n)) {
      fn = registeredOperators[n];
      const inst = fn(obj[n]);
      result.push(inst);
    } else {
      const m = n.match(COMPARE_LEFT_PATTERN);
      if (!m)
        throw new TypeError(`"${n}" is not a valid expression definition`);
      // A bare array value with no explicit operator (e.g. {status: [...]})
      // means "one of these values", not literal equality to an array.
      const opKey = m[2] || (Array.isArray(v) ? 'in' : 'eq');
      fn = registeredOperators[opKey];
      if (!fn) throw new Error(`Unknown operator "${opKey}"`);
      const inst = fn(m[1], v);
      result.push(inst);
    }
  }
  return result;
}

/**
 * Abstract constructor for `AND`/`OR` operators. Not meant to be
 * constructed directly - use {@link And} or {@link Or}.
 *
 * @param expressions - Initial conditions, same accepted forms as {@link LogicalOperator.add}.
 * @throws {TypeError} If instantiated directly rather than through a subclass, or given an invalid condition.
 */
export const LogicalOperator = function (
  this: LogicalOperator,
  ...expressions: any[]
) {
  if (!(this instanceof LogicalOperator))
    return new LogicalOperator(...expressions);
  if (this.constructor === LogicalOperator) {
    throw new TypeError(
      'LogicalOperator is abstract and cannot be instantiated',
    );
  }
  Operator.call(this);
  this._items = [];
  this.add(...expressions);
} as LogicalOperatorCtor;

LogicalOperator.prototype = Object.create(Operator.prototype);
LogicalOperator.prototype.constructor = LogicalOperator;

Object.defineProperty(LogicalOperator.prototype, '_type', {
  get() {
    return SerializationType.LOGICAL_EXPRESSION;
  },
});

/** @see {@link LogicalOperator.add} */
LogicalOperator.prototype.add = function (
  this: LogicalOperator,
  ...expressions: (LogicalOperator | any)[]
) {
  for (const item of expressions) {
    if (!item) continue;
    if (isLogicalOperator(item)) {
      this._items.push(item);
    } else if (isRaw(item) || isCompOperator(item) || isNot(item)) {
      this._items.push(item);
    } else if (isPlainObject(item)) {
      this.add(...wrapObject(item));
    } else throw new TypeError('Operator or Raw type required');
  }
  return this;
};

/** Serializes each item and joins them with this operator's keyword (`and`/`or`). */
LogicalOperator.prototype._serialize = function (
  this: LogicalOperator,
  ctx: SerializeContext,
) {
  const arr: string[] = [];
  for (const t of this._items) {
    const s: string = ctx.anyToSQL(t);
    /* istanbul ignore else */
    if (s) arr.push(s);
  }
  return ctx.serialize(SerializationType.LOGICAL_EXPRESSION, arr, () => {
    const s = printArray(arr, ' ' + String(this._operatorType));
    return s.indexOf('\n') > 0 ? s.replace('\n', '\n\t') + '\b' : s;
  });
};
