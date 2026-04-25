import { SerializationType } from './enums.js';
import type { Serializable } from './serializable.js';
import type {
  Case,
  CompOperator,
  Count,
  Delete,
  Field,
  GroupColumn,
  Insert,
  Join,
  LogicalOperator,
  OrderColumn,
  Param,
  Query,
  Raw,
  ReturningColumn,
  Select,
  TableName,
  Update,
} from './sql/index.js';

export function isSerializable(value: any): value is Serializable {
  return typeof value === 'object' && typeof value._serialize === 'function';
}

export function isQuery(value: any): value is Query {
  return (
    isSerializable(value) &&
    typeof (value as any).generate === 'function' &&
    typeof (value as any).values === 'function'
  );
}

export function isRaw(value: any): value is Raw {
  return isSerializable(value) && value._type === SerializationType.RAW;
}

export function isSelect(value: any): value is Select {
  return (
    isSerializable(value) && value._type === SerializationType.SELECT_QUERY
  );
}

export function isInsert(value: any): value is Insert {
  return (
    isSerializable(value) && value._type === SerializationType.INSERT_QUERY
  );
}

export function isIUpdate(value: any): value is Update {
  return (
    isSerializable(value) && value._type === SerializationType.UPDATE_QUERY
  );
}

export function isDelete(value: any): value is Delete {
  return (
    isSerializable(value) && value._type === SerializationType.DELETE_QUERY
  );
}

export function isJoin(value: any): value is Join {
  return isSerializable(value) && value._type === SerializationType.JOIN;
}

export function isCase(value: any): value is Case {
  return (
    isSerializable(value) && value._type === SerializationType.CASE_STATEMENT
  );
}

export function isCount(value: any): value is Count {
  return (
    isSerializable(value) && value._type === SerializationType.COUNT_STATEMENT
  );
}

export function isParam(value: any): value is Param {
  return (
    isSerializable(value) &&
    value._type === SerializationType.EXTERNAL_PARAMETER
  );
}

export function isLogicalOperator(value: any): value is LogicalOperator {
  return (
    isSerializable(value) &&
    value._type === SerializationType.LOGICAL_EXPRESSION
  );
}

export function isCompOperator(value: any): value is CompOperator {
  return (
    isSerializable(value) &&
    value._type === SerializationType.COMPARISON_EXPRESSION
  );
}

export function isNot(value: any): value is CompOperator {
  return (
    isSerializable(value) &&
    value._type === SerializationType.NEGATIVE_EXPRESSION
  );
}

export function isSelectColumn(value: any): value is Field {
  return isSerializable(value) && value._type === SerializationType.FIELD_NAME;
}

export function isOrderColumn(value: any): value is OrderColumn {
  return (
    isSerializable(value) && value._type === SerializationType.ORDER_COLUMN
  );
}

export function isGroupColumn(value: any): value is GroupColumn {
  return (
    isSerializable(value) && value._type === SerializationType.GROUP_COLUMN
  );
}

export function isReturningColumn(value: any): value is ReturningColumn {
  return (
    isSerializable(value) && value._type === SerializationType.RETURNING_COLUMN
  );
}

export function isTableName(value: any): value is TableName {
  return isSerializable(value) && value._type === SerializationType.TABLE_NAME;
}
