import type { Adapter, QueryRequest } from '@sqb/connect';
import assert from 'assert';
import oracledb from 'oracledb';
import { fetchTypeMap } from './constants.js';
import { OraCursor } from './ora-cursor.js';

/**
 * `@sqb/connect` {@link Adapter.Connection} wrapping a raw `oracledb`
 * driver connection: translates `QueryRequest`s into driver calls
 * (including cursor-mode result sets and `RETURNING`-on-`INSERT`/`UPDATE`
 * emulation, since Oracle's own `RETURNING ... INTO` needs out-bind
 * variables this layer doesn't set up) and normalizes results/column
 * metadata back into SQB's portable shape.
 */
export class OraConnection implements Adapter.Connection {
  private intlcon?: oracledb.Connection;
  public serverVersion: string;
  private _inTransaction = false;

  constructor(
    conn: oracledb.Connection,
    public sessionId: string,
  ) {
    this.intlcon = conn;
    this.serverVersion = '' + conn.oracleServerVersion;
  }

  /** Closes the underlying `oracledb` connection. */
  async close() {
    if (!this.intlcon) return;
    await this.intlcon.close();
    this.intlcon = undefined;
  }

  /** Rolls back any open transaction, readying the connection to be pooled/reused. */
  async reset() {
    return this.rollback();
  }

  /**
   * Marks a transaction as open. Oracle has no explicit `BEGIN`
   * statement - every DML implicitly starts a transaction - so this only
   * flips {@link getInTransaction}'s internal flag rather than issuing SQL.
   *
   * @throws {Error} if the connection is already closed
   */
  async startTransaction(): Promise<void> {
    assert.ok(
      this.intlcon,
      'Can not start transaction for a closed db session',
    );
    this._inTransaction = true;
  }

  /**
   * Commits the current transaction.
   *
   * @throws {Error} if the connection is already closed
   */
  async commit(): Promise<void> {
    assert.ok(
      this.intlcon,
      'Can not commit transaction for a closed db session',
    );
    await this.intlcon.commit();
    this._inTransaction = false;
  }

  /** Rolls back the current transaction. A no-op if the connection is already closed. */
  async rollback(): Promise<void> {
    if (!this.intlcon) return;
    await this.intlcon.rollback();
    this._inTransaction = false;
  }

  /**
   * Validates the connection with a trivial `SELECT 1 FROM dual`.
   *
   * @throws {Error} if the connection is already closed
   */
  async test(): Promise<void> {
    assert.ok(this.intlcon, 'DB session is closed');
    await this.intlcon.execute('select 1 from dual', [], {});
  }

  /**
   * Reads the session's current schema via
   * `SYS_CONTEXT('userenv', 'current_schema')`.
   *
   * @throws {Error} if the connection is already closed
   */
  async getSchema(): Promise<string> {
    assert.ok(this.intlcon, 'DB session is closed');
    const r = await this.intlcon.execute(
      "select sys_context( 'userenv', 'current_schema' ) from dual",
      [],
      {
        autoCommit: true,
      },
    );
    if (r && r.rows && r.rows[0]) return (r.rows as any)[0][0] as string;
    return '';
  }

  /**
   * Switches the session's current schema via `ALTER SESSION SET
   * CURRENT_SCHEMA`.
   *
   * @throws {Error} if the connection is already closed
   */
  async setSchema(schema: string): Promise<void> {
    assert.ok(this.intlcon, 'Can not set schema of a closed db session');
    await this.intlcon.execute(
      'alter SESSION set CURRENT_SCHEMA = ' + schema,
      [],
      { autoCommit: true },
    );
  }

  getInTransaction(): boolean {
    return this._inTransaction;
  }

  /** Stamps the outgoing `QueryRequest` with `dialect: 'oracle'` and this connection's `serverVersion`, so `@sqb/oracle-dialect` can pick the right pagination syntax for the server's Oracle version. */
  onGenerateQuery(prepared: QueryRequest): void {
    prepared.dialect = 'oracle';
    prepared.dialectVersion = this.serverVersion;
  }

  /**
   * Executes one query. For an `INSERT`/`UPDATE` with `returningFields`,
   * runs a synthesized follow-up `SELECT` to emulate `RETURNING` (an
   * `INSERT` is matched back by the row's `ROWID`, an `UPDATE` by reusing
   * the original `WHERE` clause) - `DELETE` isn't emulated here since
   * there's nothing left to re-select afterward. Reads result rows or, in
   * cursor mode, wraps the driver's `ResultSet` in an {@link OraCursor}.
   * A synthetic `row$number` column injected by `@sqb/oracle-dialect`'s
   * `ROWNUM`-based pagination rewrite (used on Oracle versions without
   * native `OFFSET`/`FETCH`) is stripped from both the field list and
   * every row before the response is returned.
   *
   * @throws {Error} if the connection is already closed
   */
  async execute(request: QueryRequest): Promise<Adapter.Response> {
    assert.ok(this.intlcon, 'Can not execute query with a closed db session');

    const oraOptions: oracledb.ExecuteOptions = {
      autoCommit: request.autoCommit,
      resultSet: request.cursor,
      outFormat: request.objectRows
        ? oracledb.OUT_FORMAT_OBJECT
        : oracledb.OUT_FORMAT_ARRAY,
    };
    if (request.cursor) oraOptions.fetchArraySize = request.fetchRows;
    else oraOptions.maxRows = request.fetchRows;

    const out: Adapter.Response = {};
    this.intlcon.action = request.action || '';
    let response = await this.intlcon.execute<any>(
      request.sql,
      request.params || [],
      oraOptions,
    );

    if (response.rowsAffected) out.rowsAffected = response.rowsAffected;

    if (out.rowsAffected === 1 && request.returningFields) {
      const m = request.sql.match(/\b(insert into|update)\b ("?\w+\.?\w+"?)/i);
      if (m) {
        const selectFields = request.returningFields.map(
          x => x.field + (x.alias ? ' as ' + x.alias : ''),
        );
        let sql = `select ${selectFields.join(',')} from ${m[2]}\n`;
        if (m[1].toLowerCase() === 'insert into') {
          sql += "where rowid='" + response.lastRowid + "'";
          response = await this.intlcon.execute(sql);
        }
        // Emulate update ... returning
        else if (m[1].toLowerCase() === 'update') {
          const m2 = request.sql.match(/where (.+)/);
          sql += m2 ? ' where ' + m2[1] : '';
          response = await this.intlcon.execute(
            sql,
            request.params || [],
            oraOptions,
          );
        }
      }
    }

    let fields;
    let rowNumberIdx = -1;
    let rowNumberName = '';
    if (response.metaData) {
      fields = out.fields = [];
      for (const [idx, v] of response.metaData.entries()) {
        if (v.name.toLowerCase() === 'row$number') {
          rowNumberIdx = idx;
          rowNumberName = v.name;
          continue;
        }
        const fetchType =
          typeof v.fetchType === 'object' ? v.fetchType.num : v.fetchType;
        const fieldInfo: Adapter.Field = {
          _inf: v,
          fieldName: v.name,
          dataType: v.dbTypeName || 'UNKNOWN',
          jsType: fetchTypeMap[fetchType || 2001],
        };
        if (v.dbTypeName === 'CHAR') fieldInfo.fixedLength = true;
        // others
        if (v.byteSize) fieldInfo.size = v.byteSize;
        if (v.nullable) fieldInfo.nullable = v.nullable;
        if (v.precision) fieldInfo.precision = v.precision;
        fields.push(fieldInfo);
      }
    }

    if (response.rows) {
      out.rowType = request.objectRows ? 'object' : 'array';
      out.rows = response.rows;
      // remove row$number fields
      if (out.rows && rowNumberIdx >= 0) {
        for (const row of out.rows) {
          if (Array.isArray(row)) row.splice(rowNumberIdx, 1);
          else delete row[rowNumberName];
        }
      }
      return out;
    }
    if (response.resultSet) {
      out.rowType = request.objectRows ? 'object' : 'array';
      out.cursor = new OraCursor(response.resultSet, {
        rowType: request.objectRows ? 'object' : 'array',
        rowNumberIdx,
        rowNumberName,
      });
    }

    return out;
  }
}
