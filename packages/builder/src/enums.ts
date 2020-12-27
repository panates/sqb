export enum JoinType {
    INNER,
    LEFT,
    LEFT_OUTER,
    RIGHT,
    RIGHT_OUTER,
    OUTER,
    FULL_OUTER
}

export enum SerializationType {
    SELECT_QUERY = 'select_query',
    SELECT_QUERY_COLUMNS = 'select_query.columns',
    SELECT_QUERY_FROM = 'select_query.from',
    SELECT_QUERY_JOIN = 'select_query.join',
    SELECT_QUERY_GROUPBY = 'select_query.groupby',
    SELECT_QUERY_ORDERBY = 'select_query.orderby',
    INSERT_QUERY = 'insert_query',
    INSERT_QUERY_COLUMNS = 'insert_query.columns',
    INSERT_QUERY_VALUES = 'insert_query.values',
    UPDATE_QUERY = 'update_query',
    UPDATE_QUERY_VALUES = 'update_query.values',
    DELETE_QUERY = 'delete_query',
    SELECT_COLUMN = 'select_column',
    GROUP_COLUMN = 'group_column',
    ORDER_COLUMN = 'order_column',
    RETURNING_COLUMN = 'returning_column',
    TABLE_NAME = 'table_name',
    JOIN = 'join',
    JOIN_CONDITIONS = 'join_conditions',
    RAW = 'raw',
    CASE_STATEMENT = 'case_expression',
    CONDITIONS_BLOCK = 'conditions_block',
    COMPARISON_EXPRESSION = 'comparison_expression',
    LOGICAL_EXPRESSION = 'logical_expression',
    RETURNING_BLOCK = 'returning_block',
    DATE_VALUE = 'date_value',
    STRING_VALUE = 'string_value',
    EXTERNAL_PARAMETER = 'external_parameter'

}

export enum OperatorType {
    and = 'and',
    or = 'or',
    eq = 'eq',
    ne = 'ne',
    gt = 'gt',
    gte = 'gte',
    lt = 'lt',
    lte = 'lte',
    between = 'between',
    notBetween = 'notBetween',
    in = 'in',
    notIn = 'notIn',
    like = 'like',
    notLike = 'nlike',
    iLike = 'iLike',
    notILike = 'nIlike',
    is = 'is',
    isNot = 'isNot',
    exists = 'exists',
    notExists = 'notExists'
}