import isPlainObject from 'putil-isplainobject';
import { SerializationType } from '../../enums.js';
import { printArray } from '../../helpers.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import {
  isCompOperator,
  isLogicalOperator,
  isNotOperator,
  isRawStatement,
} from '../../typeguards.js';
import { Operator } from '../operator.js';

export const WrapOps = {};
// noinspection RegExpUnnecessaryNonCapturingGroup
const COMPARE_LEFT_PATTERN = /^([\w\\.$]+(?:\[])?) *(.*)$/;

export abstract class LogicalOperator extends Operator {
  _items: Serializable[] = [];

  constructor(...expressions: any[]) {
    super();
    this.add(...expressions);
  }

  get _type(): SerializationType {
    return SerializationType.LOGICAL_EXPRESSION;
  }

  /**
   * Adds operator(s) to item list
   */
  add(...expressions: (LogicalOperator | any)[]): this {
    for (const item of expressions) {
      if (!item) continue;
      if (isLogicalOperator(item)) {
        this._items.push(item);
      } else if (
        isRawStatement(item) ||
        isCompOperator(item) ||
        isNotOperator(item)
      ) {
        this._items.push(item);
      } else if (isPlainObject(item)) {
        this.add(...this._wrapObject(item));
      } else throw new TypeError('Operator or Raw type required');
    }
    return this;
  }

  _serialize(ctx: SerializeContext): string {
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
  }

  // noinspection JSMethodCanBeStatic
  private _wrapObject(obj): Serializable[] {
    const result: Serializable[] = [];
    for (const n of Object.getOwnPropertyNames(obj)) {
      let op;
      const v = obj[n];
      if (['and', 'or'].includes(n.toLowerCase())) {
        op = WrapOps[n.toLowerCase()];
        if (!op) throw new Error(`Unknown operator "${n}"`);
        result.push(Array.isArray(v) ? op(...v) : op(v));
        continue;
      }
      if (['exists', '!exists'].includes(n)) result.push(WrapOps[n](obj[n]));
      else {
        const m = n.match(COMPARE_LEFT_PATTERN);
        if (!m)
          throw new TypeError(`"${n}" is not a valid expression definition`);
        op = WrapOps[m[2] || 'eq'];
        if (!op) throw new Error(`Unknown operator "${m[2]}"`);
        result.push(op(m[1], obj[n]));
      }
    }
    return result;
  }
}
