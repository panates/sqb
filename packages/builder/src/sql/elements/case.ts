import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { And } from '../operators/and.js';
import { LogicalOperator } from '../operators/logical-operator.js';
import { Operator } from '../operators/operator.js';
import { Raw } from './raw.js';

/**
 * A `CASE WHEN ... THEN ... [ELSE ...] END` expression, built up via
 * repeated `.when(...).then(...)` pairs. Construct via the exported
 * {@link Case} factory rather than this class directly.
 */
class CaseClass extends SqlElement {
  _expressions!: { condition: SqlElement; value: any }[];
  _elseValue: any;
  _condition?: LogicalOperator;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.CASE_STATEMENT;
  }

  /**
   * Starts a new `WHEN` branch. Must be followed by `.then(value)` to
   * complete the branch - calling `.when()` again without an intervening
   * `.then()` discards the pending condition.
   *
   * @param condition - One or more conditions, combined with `AND` if more than one.
   */
  when(...condition: (Operator | Raw)[]): this {
    if (condition.length) this._condition = new And(...condition);
    else this._condition = undefined;
    return this;
  }

  /**
   * Completes the most recent `.when(...)` branch with its result value.
   * A no-op if called without a preceding `.when(...)`.
   */
  then(value: any): this {
    if (this._condition) {
      this._expressions.push({
        condition: this._condition,
        value,
      });
    }
    return this;
  }

  /**
   * Sets the `ELSE` value, used when no `WHEN` branch matches.
   */
  else(value: any): this {
    this._elseValue = value;
    return this;
  }

  /**
   * Sets an alias for this expression when used as a `SELECT` column.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Serializes as `case when ... then ... [else ...] end`. Serializes to an
   * empty string if no `WHEN` branch was added.
   */
  _serialize(ctx: SerializeContext): string {
    if (!this._expressions.length) return '';
    const q = {
      expressions: [] as any,
      elseValue:
        this._elseValue !== undefined
          ? ctx.anyToSQL(this._elseValue)
          : undefined,
    };
    for (const x of this._expressions) {
      const o = {
        condition: x.condition._serialize(ctx),
        value: ctx.anyToSQL(x.value),
      };
      q.expressions.push(o);
    }

    return ctx.serialize(this._type, q, () => this.__defaultSerialize(ctx, q));
  }

  protected __defaultSerialize(ctx: SerializeContext, o: any): string {
    let out = 'case\n\t';
    for (const x of o.expressions) {
      out += 'when ' + x.condition + ' then ' + x.value + '\n';
    }
    if (o.elseValue !== undefined) out += 'else ' + o.elseValue + '\n';
    out += '\bend' + (this._alias ? ' ' + this._alias : '');
    return out;
  }
}

interface CaseCtor {
  new (): Case;
  (): Case;
  prototype: Case;
}

/**
 * Creates a `CASE WHEN ... THEN ... END` expression. Callable with or
 * without `new`.
 *
 * @example
 * ```ts
 * Case().when(Gt('age', 18)).then('adult').else('minor').as('category');
 * ```
 */
export const Case = function (this: Case) {
  if (!(this instanceof Case)) return new Case();
  SqlElement.call(this);
  this._expressions = [];
} as CaseCtor;

Case.prototype = CaseClass.prototype;
Case.prototype.constructor = Case;

export interface Case extends CaseClass {}
