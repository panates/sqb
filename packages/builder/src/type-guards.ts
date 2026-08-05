import { SerializationType } from './enums.js';
import type { SqlElement } from './serializable.js';
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

export function isSqlElement(
  value: any,
  type?: SerializationType,
): value is SqlElement {
  return (
    value &&
    typeof value === 'object' &&
    typeof value._serialize === 'function' &&
    (!type || value._type === type)
  );
}

/* Backward compatibility */
export const isSerializable = isSqlElement;

export function isQuery(value: any): value is Query {
  return (
    isSqlElement(value) &&
    typeof (value as any).generate === 'function' &&
    typeof (value as any).values === 'function'
  );
}

export function isRaw(value: any): value is Raw {
  return isSqlElement(value, SerializationType.RAW);
}

export function isSelect(value: any): value is Select {
  return isSqlElement(value, SerializationType.SELECT_QUERY);
}

export function isInsert(value: any): value is Insert {
  return isSqlElement(value, SerializationType.INSERT_QUERY);
}

export function isIUpdate(value: any): value is Update {
  return isSqlElement(value, SerializationType.UPDATE_QUERY);
}

export function isDelete(value: any): value is Delete {
  return isSqlElement(value, SerializationType.DELETE_QUERY);
}

export function isJoin(value: any): value is Join {
  return isSqlElement(value) && value._type === SerializationType.JOIN;
}

export function isCase(value: any): value is Case {
  return isSqlElement(value, SerializationType.CASE_STATEMENT);
}

export function isCount(value: any): value is Count {
  return isSqlElement(value, SerializationType.COUNT_STATEMENT);
}

export function isParam(value: any): value is Param {
  return isSqlElement(value, SerializationType.EXTERNAL_PARAMETER);
}

export function isLogicalOperator(value: any): value is LogicalOperator {
  return isSqlElement(value, SerializationType.LOGICAL_EXPRESSION);
}

export function isCompOperator(value: any): value is CompOperator {
  return isSqlElement(value, SerializationType.COMPARISON_EXPRESSION);
}

export function isNot(value: any): value is CompOperator {
  return isSqlElement(value, SerializationType.NEGATIVE_EXPRESSION);
}

export function isSelectColumn(value: any): value is Field {
  return isSqlElement(value, SerializationType.FIELD_NAME);
}

export function isOrderColumn(value: any): value is OrderColumn {
  return isSqlElement(value, SerializationType.ORDER_COLUMN);
}

export function isGroupColumn(value: any): value is GroupColumn {
  return isSqlElement(value, SerializationType.GROUP_COLUMN);
}

export function isReturningColumn(value: any): value is ReturningColumn {
  return isSqlElement(value, SerializationType.RETURNING_COLUMN);
}

export function isTableName(value: any): value is TableName {
  return isSqlElement(value, SerializationType.TABLE_NAME);
}

export function isFieldName(value: any): value is Field {
  return isSqlElement(value, SerializationType.FIELD_NAME);
}
