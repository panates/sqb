import { SerializationType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { isFieldName, isParam, isSqlElement } from '../../type-guards.js';
import { Param } from '../elements/index.js';
import { Operator } from './operator.js';

const EXPRESSION_PATTERN = /^([\w\\.$]+)(\[])?/;

/**
 * Abstract base for two-operand comparison operators (`Eq`, `Ne`, `Gt`,
 * `Gte`, `Lt`, `Lte`, `Like`, `ILike`, `Is`, `Between`, `In`, `Match`, and
 * their negated variants). Serializes as `<left> <symbol> <right>`, with
 * `<right>` optionally rewritten into a generated bind parameter when
 * `GenerateOptions.strictParams` is set. Construct via a concrete subclass
 * such as {@link Eq} rather than this class directly.
 */
class CompOperatorClass extends Operator {
  _left!: SqlElement | string;
  _right?: any | SqlElement;
  _symbol?: string;
  _isArray?: boolean;

  get _type(): SerializationType {
    return SerializationType.COMPARISON_EXPRESSION;
  }

  /** Serializes as `<left> <symbol> <right>` by default (subclasses like `Between`/`In`/`Exists` override this for their own shape). */
  _serialize(ctx: SerializeContext): string {
    const left = this.__serializeItem(ctx, this._left);
    if (this._isArray) left.isArray = true;
    const right = this.__serializeItem(ctx, this._right, left);
    const o: any = {
      operatorType: this._operatorType,
      symbol: this._symbol,
      left,
      right,
      orgLeft: this._left,
      orgRight: this._right,
    };
    return this.__serialize(ctx, o);
  }

  /**
   * Converts one operand (`_left` or `_right`) into its serialized form
   * plus metadata (`expression`, and for the right-hand operand,
   * `dataType`/`isArray`/`value`). When `ctx.strictParams` is set, a
   * non-`SqlElement` right-hand operand is rewritten into a generated
   * {@link Param} (named `P$_1`, `P$_2`, ...) instead of being inlined.
   *
   * @param x - The operand to serialize.
   * @param left - The already-serialized left operand, when serializing the right one (its presence is what marks `x` as the right-hand side).
   */
  __serializeItem(
    ctx: SerializeContext,
    x: string | SqlElement,
    left?: any,
  ): any {
    const isRight = !!left;
    if (ctx.strictParams && !isSqlElement(x) && isRight) {
      ctx.strictParamGenId = ctx.strictParamGenId || 0;
      const name = 'P$_' + ++ctx.strictParamGenId;
      ctx.params = ctx.params || {};
      ctx.orgParams = ctx.orgParams || {};
      ctx.params[name] = x;
      ctx.orgParams[name] = x;
      x = Param({
        name,
        dataType: left?.dataType,
        isArray: left?.isArray || Array.isArray(x),
      });
    }

    if (isSqlElement(x)) {
      const expression = ctx.anyToSQL(x);
      const result: any = {
        expression,
      };
      if (isFieldName(x)) {
        result.dataType = x._dataType;
        result.isArray = x._isArray;
      }
      if (isParam(x)) {
        let value = ctx.params ? ctx.params[x._name] : undefined;
        if (x._isArray && value != null && !Array.isArray(value))
          value = [value];
        result.value = value;
        result.isArray = x._isArray || Array.isArray(value);
        result.isParam = ctx.params?.[x._name] != undefined;
      }
      return result;
    }
    // noinspection SuspiciousTypeOfGuard
    const result: any = {
      expression: isRight || typeof x !== 'string' ? ctx.anyToSQL(x) : x,
    };
    // noinspection SuspiciousTypeOfGuard
    if (isRight || typeof x !== 'string') result.isArray = Array.isArray(x);
    return result;
  }

  /** Routes the serialized operand data through `ctx.serialize(...)` so dialects/hooks can override this comparison's output. */
  __serialize(ctx: SerializeContext, o: any): string {
    return ctx.serialize(this._type, o, (_ctx: SerializeContext, _o) =>
      this.__defaultSerialize(_ctx, _o),
    );
  }

  /** Default fallback: `<left.expression> <symbol> <right.expression>`. */
  __defaultSerialize(ctx: SerializeContext, o: any): string {
    return o.left.expression + ' ' + o.symbol + ' ' + o.right.expression;
  }
}

interface CompOperatorCtor {
  new (left: string | SqlElement, right?: any): CompOperator;
  (left: string | SqlElement, right?: any): CompOperator;
  prototype: CompOperator;
}

/**
 * Abstract constructor for two-operand comparison operators. Not meant to
 * be constructed directly - use a concrete subclass such as {@link Eq}.
 *
 * @param left - The left-hand operand: a `field[]` expression string (`[]` suffix marks it as an array field), or a {@link SqlElement}.
 * @param right - The right-hand operand (a literal value or a {@link SqlElement}); meaning depends on the concrete operator.
 * @throws {TypeError} If `left` is a string that doesn't match the expected expression format.
 */
export const CompOperator = function (
  this: CompOperator,
  left: string | SqlElement,
  right?: any,
) {
  if (!(this instanceof CompOperator)) return new CompOperator(left, right);
  Operator.call(this);
  if (typeof left === 'string') {
    const m = left.match(EXPRESSION_PATTERN);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  } else this._left = left;
  this._right = right;
} as CompOperatorCtor;

CompOperator.prototype = CompOperatorClass.prototype;
CompOperator.prototype.constructor = CompOperator;

export interface CompOperator extends CompOperatorClass {}
