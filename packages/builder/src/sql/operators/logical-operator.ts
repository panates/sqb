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

export interface LogicalOperator extends Operator {
  _items: SqlElement[];

  add(...expressions: (LogicalOperator | any)[]): this;
  _serialize(ctx: SerializeContext): string;
}

interface LogicalOperatorCtor {
  new (...expressions: any[]): LogicalOperator;
  (...expressions: any[]): LogicalOperator;
  prototype: LogicalOperator;
}

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
      fn = registeredOperators[m[2] || 'eq'];
      if (!fn) throw new Error(`Unknown operator "${m[2]}"`);
      const inst = fn(m[1], obj[n]);
      result.push(inst);
    }
  }
  return result;
}

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
