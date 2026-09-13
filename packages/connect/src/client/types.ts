import { DataType, type ParamOptions } from '@sqb/builder';
import type { PoolConfiguration } from 'lightning-pool';
import type { Maybe } from 'ts-gems';
import type { Adapter } from './adapter.js';
import type { Cursor } from './cursor.js';
import type { FieldInfoMap } from './field-info-map.js';
import type { SqbConnection } from './sqb-connection.js';

export { DataType } from '@sqb/builder';

/** A listener registered on a `@sqb/builder` query's `'execute'` event, called just before the query is sent to the driver. */
export type ExecuteHookFunction = (
  connection: SqbConnection,
  request: QueryRequest,
) => Promise<void>;
/** A listener registered on a `@sqb/builder` query's `'fetch'` event, called once per row as rows are fetched (both non-cursor results and cursor batches). */
export type FetchFunction = (row: any, request: QueryRequest) => void;
/** Transforms a single field's value before it's returned to the caller (set via `QueryExecuteOptions.transform`/`ClientDefaults.transform`). */
export type ValueTransformFunction = (value: any, fieldInfo?: FieldInfo) => any;
/** A callback passed to `SqbClient.acquire(fn)`, receiving an auto-released connection for the duration of the call. */
export type TransactionFunction = (connection: SqbConnection) => Promise<any>;

/** Whether result rows are delivered as plain objects (`{ field: value }`) or arrays (values in column order). */
export type RowType = 'array' | 'object';
/**
 * Controls how database field names are mapped onto result object keys and
 * `FieldInfo.name`: one of the built-in case transforms, `'original'`
 * (no change), or a custom mapping function (returning a falsy value drops
 * the field).
 */
export type FieldNaming =
  | 'original'
  | 'lowercase'
  | 'uppercase'
  | 'camelcase'
  | 'pascalcase'
  | ((fieldName: string) => Maybe<string>);
/** A single result row, keyed by field name. */
export type ObjectRow = Record<string, any>;
/** A single result row, as values in column order. */
export type ArrayRow = any[];
/** A result set of object rows. */
export type ObjectRowset = ObjectRow[];
/** A result set of array rows. */
export type ArrayRowset = ArrayRow[];

/** Configuration passed to `new SqbClient(...)`, identifying the target database and driver plus connection-pool and default query behavior. */
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

/** Default query-execution behavior for every connection acquired from a `SqbClient`, overridable per-call via `QueryExecuteOptions`. */
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

/** Options passed to `SqbClient.acquire(...)` when obtaining a connection. */
export interface ConnectionOptions {
  /**
   *  If this property is true, the transaction committed at the end of query execution.
   *  Default = false
   */
  autoCommit?: boolean;
}

/** Options accepted by `SqbClient.execute(...)`/`SqbConnection.execute(...)`, controlling how one query is run. */
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

/** The result of executing a query via `SqbClient.execute(...)`/`SqbConnection.execute(...)`. */
export interface QueryResult {
  /** Wall-clock time the query took to execute, in milliseconds. */
  executeTime: number;
  /** Column metadata, present whenever the query produced a result set. */
  fields?: FieldInfoMap;
  /** Result rows, present for a non-cursor query that produced a result set (object or array rows, per `rowType`). */
  rows?: any;
  /** Whether `rows` are objects or arrays. */
  rowType?: RowType;
  /** The prepared request that was executed, present only when `QueryExecuteOptions.showSql` was set. */
  query?: QueryRequest;
  returns?: any;
  /** Number of rows affected by an INSERT/UPDATE/DELETE. */
  rowsAffected?: number;
  /** A cursor for streaming the result set, present when the query was executed with `{ cursor: true }`. */
  cursor?: Cursor;
}

/** Column metadata for one field of a result set, after naming-strategy/index normalization has been applied to the driver's raw {@link Adapter.Field}. */
export type FieldInfo = {
  /** Zero-based column index. */
  index: number;
  /** The field name after applying the configured `FieldNaming` strategy (may differ from `fieldName`). */
  name: string;
} & Adapter.Field;

/**
 * The fully-prepared, dialect-specific form of a query, built by
 * `SqbConnection` from a `QueryExecuteOptions` call and passed to
 * `Adapter.Connection.execute(...)`. Combines the generated SQL with every
 * resolved execution option.
 */
export interface QueryRequest {
  /** The dialect this SQL was generated for. */
  dialect?: string;
  dialectVersion?: string;
  /** The SQL text to execute. */
  sql: string;
  /** Bind parameter values for `sql`. */
  params?: any;
  /** Per-parameter type/array metadata, in the same shape (object or array) as `params`. */
  paramOptions?: Record<string, ParamOptions> | ParamOptions[];
  /** When true, tells the adapter to normalize `:name`-style named parameters in `sql` (set for raw SQL string queries, not `@sqb/builder` queries, which resolve their own parameters). */
  normalizeNamedParams?: boolean;
  /** The columns requested via `.returning(...)`, if any, with their optional aliases. */
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
  /** Listeners from the query's `'execute'` event (only present for a `@sqb/builder` query, not a raw SQL string). */
  executeHooks?: ExecuteHookFunction[];
  /** Listeners from the query's `'fetch'` event (only present for a `@sqb/builder` query, not a raw SQL string). */
  fetchHooks?: FetchFunction[];
}
