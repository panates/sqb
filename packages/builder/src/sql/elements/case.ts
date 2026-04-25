import { SerializationType } from '../../enums.js';
import { Serializable } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { And } from '../operators/and.js';
import { LogicalOperator } from '../operators/logical-operator.js';
import { Operator } from '../operators/operator.js';
import { Raw } from './raw.js';

class CaseClass extends Serializable {
  _expressions!: { condition: Serializable; value: any }[];
  _elseValue: any;
  _condition?: LogicalOperator;
  _alias?: string;

  get _type(): SerializationType {
    return SerializationType.CASE_STATEMENT;
  }

  /**
   * Defines "when" part of Case expression.
   */
  when(...condition: (Operator | Raw)[]): this {
    if (condition.length) this._condition = new And(...condition);
    else this._condition = undefined;
    return this;
  }

  /**
   * Defines "then" part of Case expression.
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
   * Defines "else" part of Case expression.
   */
  else(value: any): this {
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

interface CaseCtor {
  new (): Case;
  (): Case;
  prototype: Case;
}

export const Case = function (this: Case) {
  if (!(this instanceof Case)) return new Case();
  Serializable.call(this);
  this._expressions = [];
} as CaseCtor;

Case.prototype = CaseClass.prototype;
Case.prototype.constructor = Case;

export interface Case extends CaseClass {}
