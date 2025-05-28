import { SerializationType } from '../enums.js';
import { Serializable } from '../serializable.js';
import { SerializeContext } from '../serialize-context.js';
import { Operator } from './operator.js';
import { LogicalOperator } from './operators/logical-operator.js';
import { OpAnd } from './operators/op-and.js';
import { RawStatement } from './raw-statement.js';

export class CaseStatement extends Serializable {
  _expressions: { condition: Serializable; value: any }[];
  _elseValue: any;
  _condition?: LogicalOperator;
  _alias?: string;

  constructor() {
    super();
    this._expressions = [];
  }

  get _type(): SerializationType {
    return SerializationType.CASE_STATEMENT;
  }

  /**
   * Defines "when" part of Case expression.
   */
  when(...condition: (Operator | RawStatement)[]): this {
    if (condition.length) this._condition = new OpAnd(...condition);
    else this._condition = undefined;
    return this;
  }

  /**
   * Defines "then" part of Case expression.
   */
  then(value): this {
    if (this._condition) {
      this._expressions.push({
        condition: this._condition,
        value,
      });
    }
    return this;
  }

  /**
   * Defines "else" part of Case expression.
   */
  else(value): this {
    this._elseValue = value;
    return this;
  }

  /**
   * Sets alias to case expression.
   */
  as(alias: string): this {
    this._alias = alias;
    return this;
  }

  /**
   * Performs serialization
   *
   * @param {Object} ctx
   * @return {string}
   * @override
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
