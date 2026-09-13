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

/**
 * Type guard checking whether `value` implements {@link SqlElement} (i.e.
 * has a callable `_serialize` method), optionally narrowed further to a
 * specific {@link SerializationType}. This is the primitive every other type
 * guard in this file is built on.
 *
 * @param value - The value to test.
 * @param type - If given, also requires `value._type` to match this exact {@link SerializationType}.
 */
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

/**
 * Type guard checking whether `value` is a {@link Query} (any of
 * `Select`/`Insert`/`Update`/`Delete`/`Union`) rather than a smaller SQL
 * element such as an operator or column reference.
 */
export function isQuery(value: any): value is Query {
  return (
    isSqlElement(value) &&
    typeof (value as any).generate === 'function' &&
    typeof (value as any).values === 'function'
  );
}

/** Type guard for a {@link Raw} SQL fragment. */
export function isRaw(value: any): value is Raw {
  return isSqlElement(value, SerializationType.RAW);
}

/** Type guard for a {@link Select} query. */
export function isSelect(value: any): value is Select {
  return isSqlElement(value, SerializationType.SELECT_QUERY);
}

/** Type guard for an {@link Insert} query. */
export function isInsert(value: any): value is Insert {
  return isSqlElement(value, SerializationType.INSERT_QUERY);
}

/** Type guard for an {@link Update} query. */
export function isIUpdate(value: any): value is Update {
  return isSqlElement(value, SerializationType.UPDATE_QUERY);
}

/** Type guard for a {@link Delete} query. */
export function isDelete(value: any): value is Delete {
  return isSqlElement(value, SerializationType.DELETE_QUERY);
}

/** Type guard for a {@link Join} clause. */
export function isJoin(value: any): value is Join {
  return isSqlElement(value) && value._type === SerializationType.JOIN;
}

/** Type guard for a {@link Case} expression. */
export function isCase(value: any): value is Case {
  return isSqlElement(value, SerializationType.CASE_STATEMENT);
}

/** Type guard for a {@link Count} expression (`count(*)`). */
export function isCount(value: any): value is Count {
  return isSqlElement(value, SerializationType.COUNT_STATEMENT);
}

/** Type guard for a {@link Param} bind-parameter placeholder. */
export function isParam(value: any): value is Param {
  return isSqlElement(value, SerializationType.EXTERNAL_PARAMETER);
}

/** Type guard for a {@link LogicalOperator} (`And`/`Or`). */
export function isLogicalOperator(value: any): value is LogicalOperator {
  return isSqlElement(value, SerializationType.LOGICAL_EXPRESSION);
}

/** Type guard for a {@link CompOperator} (`Eq`, `Gt`, `Like`, etc.). */
export function isCompOperator(value: any): value is CompOperator {
  return isSqlElement(value, SerializationType.COMPARISON_EXPRESSION);
}

/** Type guard for a {@link Not} negation expression. */
export function isNot(value: any): value is CompOperator {
  return isSqlElement(value, SerializationType.NEGATIVE_EXPRESSION);
}

/** Type guard for a {@link Field} used as a selected column. */
export function isSelectColumn(value: any): value is Field {
  return isSqlElement(value, SerializationType.FIELD_NAME);
}

/** Type guard for an {@link OrderColumn} (`ORDER BY` entry). */
export function isOrderColumn(value: any): value is OrderColumn {
  return isSqlElement(value, SerializationType.ORDER_COLUMN);
}

/** Type guard for a {@link GroupColumn} (`GROUP BY` entry). */
export function isGroupColumn(value: any): value is GroupColumn {
  return isSqlElement(value, SerializationType.GROUP_COLUMN);
}

/** Type guard for a {@link ReturningColumn} (`RETURNING` entry). */
export function isReturningColumn(value: any): value is ReturningColumn {
  return isSqlElement(value, SerializationType.RETURNING_COLUMN);
}

/** Type guard for a {@link TableName} reference. */
export function isTableName(value: any): value is TableName {
  return isSqlElement(value, SerializationType.TABLE_NAME);
}

/** Type guard for a {@link Field}; equivalent to {@link isSelectColumn}. */
export function isFieldName(value: any): value is Field {
  return isSqlElement(value, SerializationType.FIELD_NAME);
}
