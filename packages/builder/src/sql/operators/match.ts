import { OperatorType } from '../../enums.js';
import { SqlElement } from '../../serializable.js';
import { SerializeContext } from '../../serialize-context.js';
import { CompOperator } from './comp-operator.js';

class MatchClass extends CompOperator {
  customArgs?: any;

  __serialize(ctx: SerializeContext, o: any): string {
    if (!o.right.expression) return '';
    if (o.right && typeof o.right.expression !== 'string')
      o.right.expression = String(o.right.expression);
    o.customArgs = this.customArgs;
    return ctx.serialize(this._type, o, (_ctx: SerializeContext, _o) =>
      this.__defaultSerialize(_ctx, _o),
    );
  }
}

interface MatchCtor {
  new (
    left: string | SqlElement,
    right?: string | SqlElement,
    customArgs?: any,
  ): Match;
  (
    left: string | SqlElement,
    right?: string | SqlElement,
    customArgs?: any,
  ): Match;
  prototype: Match;
}

export const Match = function (
  this: Match,
  left: string | SqlElement,
  right?: string | SqlElement,
  customArgs?: any,
) {
  if (!(this instanceof Match)) return new Match(left, right, customArgs);
  CompOperator.call(this, left, right);
  this._operatorType = OperatorType.match;
  this._symbol = '=';
  this.customArgs = customArgs;
  if (typeof left === 'string') {
    const m = left.match(/^([\w\\.$]+)(\[])?/);
    if (!m)
      throw new TypeError(`"${left}" is not a valid expression definition`);
    this._left = m[1];
    this._isArray = !!m[2];
  }
} as MatchCtor;

Match.prototype = MatchClass.prototype;
Match.prototype.constructor = Match;

export interface Match extends MatchClass {}
