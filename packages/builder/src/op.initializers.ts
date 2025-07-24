import { SelectQuery } from './query/select-query.js';
import { Serializable } from './serializable.js';
import { Operator } from './sql-objects/operator.js';
import { WrapOps } from './sql-objects/operators/logical-operator.js';
import { OpAnd } from './sql-objects/operators/op-and.js';
import { OpBetween } from './sql-objects/operators/op-between.js';
import { OpEq } from './sql-objects/operators/op-eq.js';
import { OpExists } from './sql-objects/operators/op-exists.js';
import { OpGt } from './sql-objects/operators/op-gt.js';
import { OpGte } from './sql-objects/operators/op-gte.js';
import { OpILike } from './sql-objects/operators/op-ilike.js';
import { OpIn } from './sql-objects/operators/op-in.js';
import { OpIs } from './sql-objects/operators/op-is.js';
import { OpIsNot } from './sql-objects/operators/op-is-not.js';
import { OpLike } from './sql-objects/operators/op-like.js';
import { OpLt } from './sql-objects/operators/op-lt.js';
import { OpLte } from './sql-objects/operators/op-lte.js';
import { OpNe } from './sql-objects/operators/op-ne.js';
import { OpNot } from './sql-objects/operators/op-not.js';
import { OpNotBetween } from './sql-objects/operators/op-not-between.js';
import { OpNotExists } from './sql-objects/operators/op-not-exists.js';
import { OpNotILike } from './sql-objects/operators/op-not-ilike.js';
import { OpNotIn } from './sql-objects/operators/op-not-in.js';
import { OpNotLike } from './sql-objects/operators/op-not-like.js';
import { OpOr } from './sql-objects/operators/op-or.js';
import { RawStatement } from './sql-objects/raw-statement.js';

function And(...args: (Operator | RawStatement)[]) {
  return new OpAnd(...args);
}

function Or(...args: (Operator | RawStatement)[]) {
  return new OpOr(...args);
}

function Eq(expression: string | Serializable, value: any) {
  return new OpEq(expression, value);
}

function Ne(expression: string | Serializable, value: any) {
  return new OpNe(expression, value);
}

function Gt(expression: string | Serializable, value: any) {
  return new OpGt(expression, value);
}

function Gte(expression: string | Serializable, value: any) {
  return new OpGte(expression, value);
}

function Lt(expression: string | Serializable, value: any) {
  return new OpLt(expression, value);
}

function Lte(expression: string | Serializable, value: any) {
  return new OpLte(expression, value);
}

function Between(expression: string | Serializable, values: any[]);
function Between(expression: string | Serializable, value1: any, value2: any);
function Between(expression: string | Serializable, value1: any, value2?: any) {
  const values = Array.isArray(value1) ? value1 : [value1, value2];
  return new OpBetween(expression, values);
}

function NotBetween(expression: string | Serializable, values: any[]);
function NotBetween(
  expression: string | Serializable,
  value1: any,
  value2: any,
);
function NotBetween(
  expression: string | Serializable,
  value1: any,
  value2?: any,
) {
  const values = Array.isArray(value1) ? value1 : [value1, value2];
  return new OpNotBetween(expression, values);
}

function In(expression: string | Serializable, value: any) {
  return new OpIn(expression, value);
}

function NotIn(expression: string | Serializable, value: any) {
  return new OpNotIn(expression, value);
}

function Like(expression: string | Serializable, value: any) {
  return new OpLike(expression, value);
}

function NotLike(expression: string | Serializable, value: any) {
  return new OpNotLike(expression, value);
}

function Ilike(expression: string | Serializable, value: any) {
  return new OpILike(expression, value);
}

function NotILike(expression: string | Serializable, value: any) {
  return new OpNotILike(expression, value);
}

function Is(expression: string | Serializable, value: any) {
  return new OpIs(expression, value);
}

function IsNot(expression: string | Serializable, value: any) {
  return new OpIsNot(expression, value);
}

function Exists(expression: SelectQuery) {
  return new OpExists(expression);
}

function NotExists(expression: SelectQuery) {
  return new OpNotExists(expression);
}

function Not(expression: Serializable) {
  return new OpNot(expression);
}

const op = {
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
  ilike: Ilike,
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

Object.assign(WrapOps, op);

export { op };

export {
  And,
  Between,
  Eq,
  Eq as Equal,
  Exists,
  Gte as GreaterAnEqualTo,
  Gt as GreaterThan,
  Gt,
  Gte,
  Ilike,
  In,
  Is,
  IsNot,
  Like,
  Lte as LowerAndEqualTo,
  Lt as LowerThan,
  Lt,
  Lte,
  Ne,
  NotILike as Nilike,
  NotIn as Nin,
  NotLike as NLike,
  Not,
  NotBetween,
  Ne as NotEqual,
  NotExists,
  NotILike,
  NotIn,
  NotLike,
  Or,
};
