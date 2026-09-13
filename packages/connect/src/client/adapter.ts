import { Query } from '@sqb/builder';
import type { Maybe } from 'ts-gems';
import {
  type ClientConfiguration,
  DataType,
  type QueryRequest,
  type RowType,
} from './types.js';

/**
 * The contract a database driver package (`@sqb/postgres`, `@sqb/mysql`,
 * `@sqb/oracle`, etc.) implements and registers via
 * `AdapterRegistry.register(...)`. `SqbClient` looks one up by `driver` or
 * `dialect` name and uses `connect(...)` as its connection-pool factory -
 * everything above this layer (`SqbClient`/`SqbConnection`/`Cursor`) is
 * driver-agnostic and only talks to the database through this interface.
 */
export interface Adapter {
  /** Unique driver name (e.g. `'postgrejs'`, `'mysql2'`), used to look this adapter up via `driver` in `ClientConfiguration`. */
  driver: string;
  /** SQL dialect name (e.g. `'postgres'`, `'mysql'`), used to look this adapter up via `dialect` in `ClientConfiguration`, and to select dialect-specific SQL serialization in `@sqb/builder`. */
  dialect: string;
  /** Capabilities this adapter supports, consulted by callers that need to branch on driver-specific behavior. */
  features?: Adapter.Features;
  /** Opens a new physical connection using the given configuration. Called by the connection pool as needed, not once per `SqbClient`. */
  connect: (config: ClientConfiguration) => Promise<Adapter.Connection>;
}

export namespace Adapter {
  /**
   * A single physical database connection, as returned by
   * {@link Adapter.connect}. Wrapped by `SqbConnection`, which is what
   * application code actually interacts with.
   */
  export interface Connection {
    /** Driver-specific session/connection identifier, used for logging. */
    sessionId: any;
    /** Executes one query/statement and returns its result. */
    execute: (request: QueryRequest) => Promise<Response>;
    /** Closes the physical connection. */
    close: () => Promise<void>;
    /** Resets connection state (e.g. rolls back an open transaction) so the connection can be safely returned to the pool. */
    reset: () => Promise<void>;
    /** Validates that the connection is still usable (used by the pool for health checks). */
    test: () => Promise<void>;
    /** Begins a transaction. */
    startTransaction: () => Promise<void>;
    /** Creates a savepoint within the current transaction, if the driver supports savepoints. */
    setSavepoint?: (savepoint: string) => Promise<void>;
    /** Releases a previously created savepoint, if the driver supports savepoints. */
    releaseSavepoint?: (savepoint: string) => Promise<void>;
    /** Rolls back to a previously created savepoint, if the driver supports savepoints. */
    rollbackSavepoint?: (savepoint: string) => Promise<void>;
    /** Commits the current transaction. */
    commit: () => Promise<void>;
    /** Rolls back the current transaction. */
    rollback: () => Promise<void>;
    /** Sets the active schema/search-path for this connection, if the driver/dialect supports it. */
    setSchema?: (schema: string) => Promise<void>;
    /** Reads the active schema/search-path for this connection, if the driver/dialect supports it. */
    getSchema?: () => Promise<string>;
    /** Optional hook invoked with the generated `@sqb/builder` query just before it's sent, letting the driver inspect or mutate the request. */
    onGenerateQuery?: (request: QueryRequest, query: Query) => void;
    /** Reports whether a transaction is currently open on this connection, when the driver can determine it directly rather than relying on `SqbConnection`'s own tracking. */
    getInTransaction?: () => boolean;
  }

  /**
   * A driver-level, unidirectional result-set cursor, wrapped by the
   * higher-level `Cursor` class (`client/cursor.ts`) which adds
   * caching/seeking/streaming on top.
   */
  export interface Cursor {
    /** Whether the cursor has been closed. */
    readonly isClosed: boolean;
    /** Whether rows are delivered as objects or arrays. */
    readonly rowType: RowType;
    /** Closes the cursor and releases its server-side resources. */
    close: () => Promise<void>;
    /** Fetches up to `rows` more rows, or `undefined`/an empty result once exhausted. */
    fetch: (rows: number) => Promise<Maybe<any[]>>;
  }

  /** The raw result of {@link Connection.execute}, before `SqbConnection` normalizes it into a `QueryResult`. */
  export interface Response {
    /** Column metadata, present whenever the statement produced a result set. */
    fields?: Field[];
    /** Result rows, present for a non-cursor query that produced a result set. */
    rows?: Record<string, any>[] | any[][];
    /** Whether `rows` (or cursor-fetched rows) are objects or arrays. */
    rowType?: RowType;
    /** A cursor for streaming the result set, present when the query was executed in cursor mode. */
    cursor?: Adapter.Cursor;
    /** Number of rows affected by an INSERT/UPDATE/DELETE. */
    rowsAffected?: number;
  }

  /** Column metadata for one field of a result set, as reported by the driver. */
  export interface Field {
    /** The column name as returned by the driver. */
    fieldName: string;
    /** The driver-reported SQL data type name (driver/dialect-specific, e.g. `'VARCHAR2'`). */
    dataType: string;
    /** The JS type this column's values are represented as (e.g. `'string'`, `'number'`, `'Date'`). */
    jsType: string;
    /** Whether the column value is an array. */
    isArray?: boolean;
    /** For an array column, the element data type. */
    elementDataType?: string;
    /** Whether the column accepts `NULL`. */
    nullable?: boolean;
    /** Whether a character column is fixed-length (e.g. `CHAR` vs `VARCHAR`). */
    fixedLength?: boolean;
    /** Declared size/length of the column, if applicable. */
    size?: number;
    /** Declared precision of a numeric column, if applicable. */
    precision?: number;
    /** Driver-specific raw field-info object, passed through unchanged for driver-specific consumers. */
    _inf: any;
  }

  /** Declares which optional capabilities an {@link Adapter} supports. */
  export interface Features {
    /** Whether this driver supports cursor-mode (streaming) query execution. */
    cursor?: boolean;
    /** Whether this driver/dialect supports schema switching (`setSchema`/`getSchema`). */
    schema?: boolean;
    /** Data types this driver can be asked to fetch as their string representation instead of a native JS type. */
    fetchAsString?: DataType[];
    /** Whether this driver binds parameters positionally (`$1`, `:1`, `?`) rather than by name. */
    positionalParams?: boolean;
  }
}
