import { type Adapter, DataType, type QueryRequest } from '@sqb/connect';
import { tokenize } from 'fast-tokenizer';
import {
  BindParam,
  Connection,
  DataTypeOIDs,
  type FieldInfo,
  type OID,
  type QueryOptions,
} from 'postgrejs';
import { PgCursor } from './pg-cursor.js';

/** Maps SQB's portable {@link DataType} enum to the `postgrejs` driver's scalar and array OIDs (`[scalarOID, arrayOID]`), used to bind a parameter as its intended PostgreSQL type rather than relying on the driver's own type inference. */
const SqbDataTypToOIDMap = {
  [DataType.BOOL]: [DataTypeOIDs.bool, DataTypeOIDs._bool],
  [DataType.CHAR]: [DataTypeOIDs.char, DataTypeOIDs._char],
  [DataType.VARCHAR]: [DataTypeOIDs.varchar, DataTypeOIDs._varchar],
  [DataType.SMALLINT]: [DataTypeOIDs.int2, DataTypeOIDs._int2],
  [DataType.INTEGER]: [DataTypeOIDs.int4, DataTypeOIDs._int4],
  [DataType.BIGINT]: [DataTypeOIDs.int8, DataTypeOIDs._int8],
  [DataType.FLOAT]: [DataTypeOIDs.float4, DataTypeOIDs._float4],
  [DataType.DOUBLE]: [DataTypeOIDs.float8, DataTypeOIDs._float8],
  [DataType.NUMBER]: [DataTypeOIDs.float8, DataTypeOIDs._float8],
  [DataType.DATE]: [DataTypeOIDs.date, DataTypeOIDs._date],
  [DataType.TIMESTAMP]: [DataTypeOIDs.timestamp, DataTypeOIDs._timestamp],
  [DataType.TIMESTAMPTZ]: [DataTypeOIDs.timestamptz, DataTypeOIDs._timestamptz],
  [DataType.TIME]: [DataTypeOIDs.time, DataTypeOIDs._time],
  [DataType.BINARY]: [DataTypeOIDs.bytea, DataTypeOIDs._bytea],
  [DataType.TEXT]: [DataTypeOIDs.text, DataTypeOIDs._text],
  [DataType.GUID]: [DataTypeOIDs.uuid, DataTypeOIDs._uuid],
};

/** Matches a whole tokenized `:name` parameter reference (with any leading whitespace preserved), used by {@link PgConnection._normalizeNamedParams}. */
const NAMED_PARAM_PATTERN = /^( *):([a-zA-Z_]\w*)$/;

/**
 * `@sqb/connect` {@link Adapter.Connection} wrapping a `postgrejs`
 * `Connection`: translates `QueryRequest`s into driver calls (typed
 * parameter binding via {@link SqbDataTypToOIDMap}, named-to-positional
 * parameter rewriting, savepoints, schema switching via `search_path`) and
 * normalizes results/column metadata back into SQB's portable shape. Most
 * of the actual query execution is already handled by the `postgrejs`
 * driver itself; this class is a comparatively thin adapter layer.
 */
export class PgConnection implements Adapter.Connection {
  private intlcon?: Connection;

  constructor(conn: Connection) {
    this.intlcon = conn;
  }

  get sessionId(): any {
    return this.intlcon && this.intlcon.processID;
  }

  /** Closes the underlying `postgrejs` connection. A no-op if already closed. */
  async close() {
    if (!this.intlcon) return;
    await this.intlcon.close(0);
    this.intlcon = undefined;
  }

  /** Rolls back any open transaction, readying the connection to be pooled/reused. */
  async reset() {
    return this.rollback();
  }

  /**
   * Begins a transaction.
   *
   * @throws {Error} if the connection is already closed
   */
  async startTransaction(): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not start transaction for a closed db session');
    await this.intlcon.startTransaction();
  }

  /**
   * Commits the current transaction.
   *
   * @throws {Error} if the connection is already closed
   */
  async commit(): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not commit transaction for a closed db session');
    await this.intlcon.commit();
  }

  /** Rolls back the current transaction. A no-op if the connection is already closed. */
  async rollback(): Promise<void> {
    if (!this.intlcon) return;
    await this.intlcon.rollback();
  }

  /**
   * Creates a named savepoint within the current transaction.
   *
   * @throws {Error} if the connection is already closed
   */
  async setSavepoint(savepoint: string): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not set savepoint for a closed db session');
    return this.intlcon.savepoint(savepoint);
  }

  /**
   * Releases a previously-created savepoint, without rolling back to it.
   *
   * @throws {Error} if the connection is already closed
   */
  async releaseSavepoint(savepoint: string): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not release savepoint for a closed db session');
    return this.intlcon.releaseSavepoint(savepoint);
  }

  /**
   * Rolls the current transaction back to a previously-created savepoint.
   *
   * @throws {Error} if the connection is already closed
   */
  async rollbackSavepoint(savepoint: string): Promise<void> {
    if (!this.intlcon)
      throw new Error(
        'Can not rollback to a savepoint for a closed db session',
      );
    return this.intlcon.rollbackToSavepoint(savepoint);
  }

  getInTransaction(): boolean {
    return !!(this.intlcon && this.intlcon.inTransaction);
  }

  /**
   * Validates the connection with a trivial `SELECT 1`.
   *
   * @throws {Error} if the connection is already closed
   */
  async test(): Promise<void> {
    if (!this.intlcon) throw new Error('DB session is closed');
    await this.intlcon.query('select 1');
  }

  /**
   * Reads the session's current schema search path via `SHOW search_path`.
   *
   * @throws {Error} if the connection is already closed
   */
  async getSchema(): Promise<string> {
    if (!this.intlcon) throw new Error('DB session is closed');
    const r = await this.intlcon.query('SHOW search_path');
    if (r && r.rows && r.rows[0]) return (r.rows as any)[0][0] as string;
    return '';
  }

  /**
   * Switches the session's schema search path via `SET search_path TO`.
   *
   * @throws {Error} if the connection is already closed
   */
  async setSchema(schema: string): Promise<void> {
    if (!this.intlcon)
      throw new Error('Can not set schema of a closed db session');
    await this.intlcon.execute('SET search_path TO ' + schema);
  }

  /** Stamps the outgoing `QueryRequest` with this session's `server_version`, so `@sqb/postgres-dialect` can pick version-appropriate SQL if it ever needs to. */
  onGenerateQuery(request: QueryRequest): void {
    if (this.intlcon) {
      request.dialectVersion = this.intlcon.sessionParameters['server_version'];
    }
  }

  /**
   * Executes one query. Rewrites `:name` placeholders to positional binds
   * first if `request.normalizeNamedParams` is set, then wraps each
   * parameter that has a known SQB {@link DataType} in a `postgrejs`
   * `BindParam` carrying the matching OID (via
   * {@link SqbDataTypToOIDMap}) so it's bound as the intended PostgreSQL
   * type rather than left to the driver's own inference; params with no
   * declared type pass through unchanged. `fetchAsString` is likewise
   * translated from SQB data types to OIDs before being handed to the
   * driver. Delegates the actual execution (including cursor-mode
   * result sets) to `postgrejs`'s `Connection.query()` and copies its
   * response fields onto SQB's portable `Adapter.Response` shape.
   */
  async execute(request: QueryRequest): Promise<Adapter.Response> {
    if (!this.intlcon)
      throw new Error('Can not execute query with a closed db session');
    if (request.normalizeNamedParams) this._normalizeNamedParams(request);

    const params = request.params?.map((v, i) => {
      const paramOpts = Array.isArray(request.paramOptions)
        ? request.paramOptions[i]
        : undefined;
      if (v != null && paramOpts && paramOpts.dataType) {
        const oid =
          SqbDataTypToOIDMap[paramOpts.dataType]?.[paramOpts.isArray ? 1 : 0];
        if (oid) return new BindParam(oid, v);
      }
      return v;
    });

    const opts: QueryOptions = {
      autoCommit: request.autoCommit,
      params,
      cursor: request.cursor,
      fetchCount: request.fetchRows,
      objectRows: request.objectRows,
    };
    if (request.fetchAsString) {
      const items = request.fetchAsString.reduce<OID[]>((a, v) => {
        const oid = SqbDataTypToOIDMap[v]?.[0];
        if (oid) a.push(oid);
        return a;
      }, []);
      if (items.length) opts.fetchAsString = items;
    }
    const resp = await this.intlcon.query(request.sql, opts);
    const out: Adapter.Response = {};
    if (resp.fields) out.fields = this._convertFields(resp.fields);
    if (resp.rows) out.rows = resp.rows;
    if (resp.cursor) out.cursor = PgCursor.create(resp.cursor);
    if (resp.rowType)
      out.rowType = resp.rowType === 'array' ? 'array' : 'object';
    if (resp.rowsAffected) out.rowsAffected = resp.rowsAffected;
    return out;
  }

  /** Converts the `postgrejs` driver's `FieldInfo[]` (already close to SQB's shape) into SQB's portable {@link Adapter.Field} array. */
  _convertFields(fields: FieldInfo[]) {
    const result: any[] = [];
    for (let i = 0; i < fields.length; i++) {
      const v = fields[i];
      const o: Adapter.Field = {
        fieldName: v.fieldName,
        dataType: v.dataTypeName,
        elementDataType: v.elementDataTypeName,
        jsType: v.jsType,
        isArray: v.isArray,
        _inf: v,
      };
      result.push(o);
    }
    return result;
  }

  /**
   * Rewrites `:name` parameter placeholders to PostgreSQL's positional
   * `$1, $2, ...` syntax in place, via a quote-aware tokenizer (rather
   * than a plain regex replace) so a `:name`-shaped substring inside a
   * string/quoted-identifier literal isn't mistaken for a parameter, and
   * so a `::type` cast (which tokenizes as a lone `:` followed by a
   * `:name`-shaped token) isn't either - see the inline comment on
   * `prevToken`. Each distinct name is assigned its positional index the
   * first time it's seen, so repeated references to the same named
   * parameter reuse one position; `request.params` is rebuilt as a
   * positional array in that same order.
   *
   * @throws {Error} if `request.params` isn't a plain key/value object (required once any named parameter is found)
   */
  _normalizeNamedParams(request: QueryRequest) {
    const tokenizer = tokenize(request.sql, {
      brackets: false,
      delimiters: undefined,
      quotes: true,
      keepBrackets: true,
      keepQuotes: true,
      keepDelimiters: true,
      emptyTokens: true,
    });
    let token: string | null;
    let out = '';
    let namedParams: Map<string, any> | undefined;
    let params = request.params;
    // Tracks the previous raw token so a "::" type-cast can be recognized:
    // the tokenizer splits it into a lone ":" token followed by a ":name"
    // token, which looks exactly like a named param unless we know the
    // ":" right before it isn't part of a legitimate delimiter. quotes:true
    // hands back an entire string/quoted-identifier literal as one token
    // (e.g. "'literal :notparam text'"), so a ":name" occurring inside one
    // never matches NAMED_PARAM_PATTERN at all - the tokenizer always
    // isolates a genuine ":name" reference as its own token (only ever
    // preceded by whitespace merged into the same token), so there's
    // nothing else in the token to rule it out with.
    let prevToken = '';
    while ((token = tokenizer.next())) {
      const m = NAMED_PARAM_PATTERN.exec(token);
      if (m && prevToken !== ':') {
        const [, leading, k] = m;
        if (!namedParams) {
          if (typeof params !== 'object' || Array.isArray(params))
            throw new Error('"params" should be an key, value object');
          namedParams = new Map();
        }
        // Register the param (even if it has no matching value) as soon as
        // it's first seen, so its index is reserved right away - deferring
        // registration until a value is found let a later, unrelated param
        // silently reuse the same index instead.
        let entry = namedParams.get(k);
        if (!entry) {
          entry = { index: namedParams.size + 1, value: params[k] };
          namedParams.set(k, entry);
        }
        token = leading + `$${entry.index}`;
      }
      const trimmed = token.trim();
      if (trimmed) prevToken = trimmed;
      out += token;
    }
    if (namedParams) {
      params = Array.from(namedParams.values());
      params.sort((a, b) => a.index - b.index);
      request.params = params.map(x => x.value);
    }
    request.sql = out;
  }
}
