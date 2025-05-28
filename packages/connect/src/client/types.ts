import { DataType, ParamOptions } from '@sqb/builder';
import type { PoolConfiguration } from 'lightning-pool';
import { Maybe } from 'ts-gems';
import type { Adapter } from './adapter.js';
import type { Cursor } from './cursor.js';
import type { FieldInfoMap } from './field-info-map.js';
import type { SqbConnection } from './sqb-connection.js';

export { DataType } from '@sqb/builder';

export type ExecuteHookFunction = (
  connection: SqbConnection,
  request: QueryRequest,
) => Promise<void>;
export type FetchFunction = (row: any, request: QueryRequest) => void;
export type ValueTransformFunction = (value: any, fieldInfo?: FieldInfo) => any;
export type TransactionFunction = (connection: SqbConnection) => Promise<any>;

export type RowType = 'array' | 'object';
export type FieldNaming =
  | 'original'
  | 'lowercase'
  | 'uppercase'
  | 'camelcase'
  | 'pascalcase'
  | ((fieldName: string) => Maybe<string>);
export type ObjectRow = Record<string, any>;
export type ArrayRow = any[];
export type ObjectRowset = ObjectRow[];
export type ArrayRowset = ArrayRow[];

export interface ClientConfiguration {
  /**
   * Dialect to be used
   */
  dialect?: string;

  /**
   * Database connection driver to be used
   */
  driver?: string;

  /**
   * Connection name
   */
  name?: string;

  /**
   * Database server address or url
   */
  host?: string;

  /**
   * Database listener port number
   *
   */
  port?: number;
  /**
   * Database username.
   */
  user?: string;

  /**
   * Database password.
   */
  password?: string;

  /**
   * Database name
   */
  database?: string;

  /**
   * Database schema
   */

  schema?: string;

  /**
   * Connection options to be passed to the underlying driver
   */
  driverOptions?: any;

  /**
   * Pooling options
   */
  pool?: PoolConfiguration;

  /**
   * Default options
   */
  defaults?: ClientDefaults;
}

export interface ClientDefaults {
  autoCommit?: boolean;
  cursor?: boolean;
  objectRows?: boolean;
  fieldNaming?: FieldNaming;
  showSql?: boolean;
  prettyPrint?: boolean;
  ignoreNulls?: boolean;

  /**
   * Sets how many row will be fetched at a time
   * Default = 10
   */
  fetchRows?: number;

  transform?: ValueTransformFunction;
}

export interface ConnectionOptions {
  /**
   *  If this property is true, the transaction committed at the end of query execution.
   *  Default = false
   */
  autoCommit?: boolean;
}

export interface QueryExecuteOptions {
  /**
   * Array of values or object that contains param/value pairs.
   */
  params?: Record<string, any> | any[];

  /**
   *  If this property is true, the transaction committed at the end of query execution.
   *  Default = false
   */
  autoCommit?: boolean;

  /**
   * If this property is true, query returns a Cursor object that works
   * in unidirectional "cursor" mode.
   * Important! Cursor keeps connection open until cursor.close() method is called.
   */
  cursor?: boolean;

  /**
   * Function for converting data before returning response.
   */
  transform?: ValueTransformFunction;

  /**
   * In "cursor" mode; it provides an initial suggested number of rows to prefetch.
   * Prefetching is a tuning option to maximize data transfer efficiency and
   * minimize round-trips to the database. In regular mode;
   * it provides the maximum number of rows that are fetched from Connection instance.
   * Default = 10
   */
  fetchRows?: number;

  /**
   * If set true, NULL fields will be ignored
   * Default = false
   */
  ignoreNulls?: boolean;

  /**
   * Sets the naming strategy for fields. It affects field names in object rows and metadata
   */
  namingStrategy?: FieldNaming;

  /**
   * Determines whether query rows should be returned as Objects or Arrays.
   * This property applies to ResultSet.objectRows property also.
   * Default = driver default
   */
  objectRows?: boolean;

  /**
   * If set true, result object contains executed sql and values.
   * Default = false
   */
  showSql?: boolean;

  prettyPrint?: boolean;

  action?: string;

  fetchAsString?: DataType[];
}

export interface QueryResult {
  executeTime: number;
  fields?: FieldInfoMap;
  rows?: any;
  rowType?: RowType;
  query?: QueryRequest;
  returns?: any;
  rowsAffected?: number;
  cursor?: Cursor;
}

export type FieldInfo = {
  index: number;
  name: string;
} & Adapter.Field;

export interface QueryRequest {
  dialect?: string;
  dialectVersion?: string;
  sql: string;
  params?: any;
  paramOptions?: Record<string, ParamOptions> | ParamOptions[];
  returningFields?: { field: string; alias?: string }[];
  autoCommit?: boolean;
  cursor?: boolean;
  objectRows?: boolean;
  ignoreNulls?: boolean;
  fetchRows?: number;
  fieldNaming?: FieldNaming;
  transform?: ValueTransformFunction;
  showSql?: boolean;
  prettyPrint?: boolean;
  action?: string;
  fetchAsString?: DataType[];
  executeHooks?: ExecuteHookFunction[];
  fetchHooks?: FetchFunction[];
}
