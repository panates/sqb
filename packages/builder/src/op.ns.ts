import { LogicalOperator } from './sql/index.js';
import { And } from './sql/operators/and.js';
import { Between } from './sql/operators/between.js';
import { Eq } from './sql/operators/eq.js';
import { Exists } from './sql/operators/exists.js';
import { Gt } from './sql/operators/gt.js';
import { Gte } from './sql/operators/gte.js';
import { ILike } from './sql/operators/i-like.js';
import { In } from './sql/operators/in.js';
import { Is } from './sql/operators/is.js';
import { IsNot } from './sql/operators/is-not.js';
import { Like } from './sql/operators/like.js';
import { Lt } from './sql/operators/lt.js';
import { Lte } from './sql/operators/lte.js';
import { Ne } from './sql/operators/ne.js';
import { Not } from './sql/operators/not.js';
import { NotBetween } from './sql/operators/not-between.js';
import { NotExists } from './sql/operators/not-exists.js';
import { NotILike } from './sql/operators/not-i-like.js';
import { NotIn } from './sql/operators/not-in.js';
import { NotLike } from './sql/operators/not-like.js';
import { Or } from './sql/operators/or.js';

export interface OperatorsMap {
  and: typeof And;
  or: typeof Or;
  eq: typeof Eq;
  '=': typeof Eq;
  ne: typeof Ne;
  '!=': typeof Ne;
  gt: typeof Gt;
  '>': typeof Gt;
  gte: typeof Gte;
  '>=': typeof Gte;
  lt: typeof Lt;
  '<': typeof Lt;
  lte: typeof Lte;
  '<=': typeof Lte;
  between: typeof Between;
  btw: typeof Between;
  notBetween: typeof NotBetween;
  nbtw: typeof NotBetween;
  '!between': typeof NotBetween;
  '!btw': typeof NotBetween;
  in: typeof In;
  notIn: typeof NotIn;
  nin: typeof NotIn;
  '!in': typeof NotIn;
  like: typeof Like;
  not: typeof Not;
  notLike: typeof NotLike;
  nlike: typeof NotLike;
  '!like': typeof NotLike;
  ilike: typeof ILike;
  notILike: typeof NotILike;
  nilike: typeof NotILike;
  '!ilike': typeof NotILike;
  is: typeof Is;
  isNot: typeof IsNot;
  '!is': typeof IsNot;
  exists: typeof Exists;
  notExists: typeof NotExists;
  '!exists': typeof NotExists;
}

const Operators: OperatorsMap = {
  and: And,
  or: Or,
  eq: Eq,
  '=': Eq,
  ne: Ne,
  '!=': Ne,
  gt: Gt,
  '>': Gt,
  gte: Gte,
  '>=': Gte,
  lt: Lt,
  '<': Lt,
  lte: Lte,
  '<=': Lte,
  between: Between,
  btw: Between,
  notBetween: NotBetween,
  nbtw: NotBetween,
  '!between': NotBetween,
  '!btw': NotBetween,
  in: In,
  notIn: NotIn,
  nin: NotIn,
  '!in': NotIn,
  like: Like,
  not: Not,
  notLike: NotLike,
  nlike: NotLike,
  '!like': NotLike,
  ilike: ILike,
  notILike: NotILike,
  nilike: NotILike,
  '!ilike': NotILike,
  is: Is,
  isNot: IsNot,
  '!is': IsNot,
  exists: Exists,
  notExists: NotExists,
  '!exists': NotExists,
};

(LogicalOperator as any).Operators = Operators;

export { Operators };
