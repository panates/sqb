import { DataType, JoinType } from './enums.js';
import { DeleteQuery } from './query/delete-query.js';
import { InsertQuery } from './query/insert-query.js';
import { Query } from './query/query.js';
import { SelectQuery } from './query/select-query.js';
import { UnionQuery } from './query/union-query.js';
import { UpdateQuery } from './query/update-query.js';
import { Serializable } from './serializable.js';
import { CaseStatement } from './sql-objects/case-statement.js';
import { CoalesceStatement } from './sql-objects/coalesce-statement.js';
import { CountStatement } from './sql-objects/count-statement.js';
import { FieldExpression } from './sql-objects/field-expression.js';
import { JoinStatement } from './sql-objects/join-statement.js';
import { LowerStatement } from './sql-objects/lower-statement.js';
import { MaxStatement } from './sql-objects/max-statement.js';
import { MinStatement } from './sql-objects/min-statement.js';
import { ParamExpression } from './sql-objects/param-expression.js';
import { RawStatement } from './sql-objects/raw-statement.js';
import { SequenceGetterStatement } from './sql-objects/sequence-getter-statement.js';
import { StringAGGStatement } from './sql-objects/string-agg-statement.js';
import { UpperStatement } from './sql-objects/upper-statement.js';

export function Raw(text: string): RawStatement {
  return new RawStatement(text);
}

export function Select(
  ...column: (string | string[] | Serializable)[]
): SelectQuery {
  return new SelectQuery(...column);
}

export function Insert(tableName: string | RawStatement, input): InsertQuery {
  return new InsertQuery(tableName, input);
}

export function Update(tableName: string | RawStatement, input): UpdateQuery {
  return new UpdateQuery(tableName, input);
}

export function Delete(tableName: string | RawStatement): DeleteQuery {
  return new DeleteQuery(tableName);
}

export function Union(...queries: Query[]): UnionQuery {
  return new UnionQuery(queries);
}

export function UnionAll(...queries: Query[]): UnionQuery {
  return new UnionQuery(queries, 'all');
}

export function Join(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.INNER, table);
}

export function InnerJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.INNER, table);
}

export function LeftJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.LEFT, table);
}

export function LeftOuterJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.LEFT_OUTER, table);
}

export function RightJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.RIGHT, table);
}

export function RightOuterJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.RIGHT_OUTER, table);
}

export function OuterJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.OUTER, table);
}

export function FullOuterJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.FULL_OUTER, table);
}

export function CrossJoin(
  table: string | SelectQuery | RawStatement,
): JoinStatement {
  return new JoinStatement(JoinType.CROSS, table);
}

export function Case(): CaseStatement {
  return new CaseStatement();
}

export function Coalesce(...expressions: any[]): CoalesceStatement {
  return new CoalesceStatement(...expressions);
}

export function Lower(expression: any): LowerStatement {
  return new LowerStatement(expression);
}

export function Upper(expression: any): UpperStatement {
  return new UpperStatement(expression);
}

export function Min(expression: any): MinStatement {
  return new MinStatement(expression);
}

export function Max(expression: any): MaxStatement {
  return new MaxStatement(expression);
}

export function StringAGG(field: any): StringAGGStatement {
  return new StringAGGStatement(field);
}

export function Count(): CountStatement {
  return new CountStatement();
}

export function SequenceNext(expression: string): SequenceGetterStatement {
  return new SequenceGetterStatement(expression, true);
}

export function SequenceCurr(expression: string): SequenceGetterStatement {
  return new SequenceGetterStatement(expression, false);
}

export function Param(
  name: string,
  dataType?: DataType,
  isArray?: boolean,
): ParamExpression;
export function Param(args: {
  name: string;
  dataType?: DataType;
  isArray?: boolean;
}): ParamExpression;
export function Param(arg0: any, arg1?: any, arg2?: any): ParamExpression {
  if (typeof arg0 === 'object') return new ParamExpression(arg0);
  return new ParamExpression({
    name: arg0,
    dataType: arg1,
    isArray: arg2,
  });
}

export function Field(
  name: string,
  dataType?: DataType,
  isArray?: boolean,
): FieldExpression;
export function Field(args: {
  name: string;
  dataType?: DataType;
  isArray?: boolean;
}): FieldExpression;
export function Field(arg0: any, arg1?: any, arg2?: any): FieldExpression {
  if (typeof arg0 === 'object') return new FieldExpression(arg0);
  return new FieldExpression(arg0, arg1, arg2);
}
