import type { Adapter, QueryRequest, RowType } from '@sqb/connect';
import type { Connection as MariadbDriverConnection } from 'mariadb';
import { MariadbCursor } from './mariadb-cursor.js';

const typeMap: Record<string, { dataType: string; jsType: string }> = {
  DECIMAL: { dataType: 'DECIMAL', jsType: 'number' },
  NEWDECIMAL: { dataType: 'DECIMAL', jsType: 'number' },
  TINY: { dataType: 'TINYINT', jsType: 'number' },
  SHORT: { dataType: 'SMALLINT', jsType: 'number' },
  LONG: { dataType: 'INT', jsType: 'number' },
  INT24: { dataType: 'MEDIUMINT', jsType: 'number' },
  FLOAT: { dataType: 'FLOAT', jsType: 'number' },
  DOUBLE: { dataType: 'DOUBLE', jsType: 'number' },
  BIGINT: { dataType: 'BIGINT', jsType: 'number' },
  TIMESTAMP: { dataType: 'TIMESTAMP', jsType: 'Date' },
  TIMESTAMP2: { dataType: 'TIMESTAMP', jsType: 'Date' },
  DATE: { dataType: 'DATE', jsType: 'Date' },
  NEWDATE: { dataType: 'DATE', jsType: 'Date' },
  TIME: { dataType: 'TIME', jsType: 'string' },
  TIME2: { dataType: 'TIME', jsType: 'string' },
  DATETIME: { dataType: 'DATETIME', jsType: 'Date' },
  DATETIME2: { dataType: 'DATETIME', jsType: 'Date' },
  YEAR: { dataType: 'YEAR', jsType: 'number' },
  BIT: { dataType: 'BIT', jsType: 'Buffer' },
  JSON: { dataType: 'JSON', jsType: 'string' },
  ENUM: { dataType: 'ENUM', jsType: 'string' },
  SET: { dataType: 'SET', jsType: 'string' },
  TINY_BLOB: { dataType: 'TINYBLOB', jsType: 'Buffer' },
  MEDIUM_BLOB: { dataType: 'MEDIUMBLOB', jsType: 'Buffer' },
  LONG_BLOB: { dataType: 'LONGBLOB', jsType: 'Buffer' },
  BLOB: { dataType: 'BLOB', jsType: 'Buffer' },
  VAR_STRING: { dataType: 'VARCHAR', jsType: 'string' },
  STRING: { dataType: 'CHAR', jsType: 'string' },
  VARCHAR: { dataType: 'VARCHAR', jsType: 'string' },
  GEOMETRY: { dataType: 'GEOMETRY', jsType: 'Buffer' },
  NULL: { dataType: 'UNKNOWN', jsType: 'any' },
};

export class MariadbConnection implements Adapter.Connection {
  private intlcon?: MariadbDriverConnection;
  private _inTransaction = false;

  constructor(conn: MariadbDriverConnection) {
    this.intlcon = conn;
  }

  get sessionId(): any {
    return this.intlcon?.threadId;
  }

  async close() {
    if (!this.intlcon) return;
    const conn = this.intlcon;
    this.intlcon = undefined;
    // destroy() (not end()) because a cursor's stream may not have been
    // fully consumed; end() waits for all in-flight commands to finish
    // and would hang in that case.
    conn.destroy();
  }

  async reset() {
    return this.rollback();
  }

  async startTransaction(): Promise<void> {
    assertDefined(this.intlcon);
    // MariaDB implicitly commits any already-active transaction when BEGIN
    // is issued again, so no "already in transaction" guard is needed here.
    await this.intlcon.beginTransaction();
    this._inTransaction = true;
  }

  async commit(): Promise<void> {
    assertDefined(this.intlcon);
    // COMMIT outside of an active transaction is a no-op in MariaDB.
    await this.intlcon.commit();
    this._inTransaction = false;
  }

  async rollback(): Promise<void> {
    assertDefined(this.intlcon);
    await this.intlcon.rollback();
    this._inTransaction = false;
  }

  getInTransaction(): boolean {
    return this._inTransaction;
  }

  async test(): Promise<void> {
    assertDefined(this.intlcon);
    await this.intlcon.query('select 1');
  }

  async execute(query: QueryRequest): Promise<Adapter.Response> {
    assertDefined(this.intlcon);
    const intlcon = this.intlcon;
    // MariaDB runs in autocommit mode by default; an explicit BEGIN is only
    // needed once per logical transaction. Re-issuing BEGIN while already
    // in a transaction would silently commit it early (MariaDB semantics),
    // so it must be guarded with _inTransaction rather than called
    // unconditionally.
    if (!query.autoCommit && !this._inTransaction)
      await this.startTransaction();

    const params = query.params;
    const rowsAsArray = !query.objectRows;
    const rowType: RowType = query.objectRows ? 'object' : 'array';
    const out: Adapter.Response = {};

    if (query.cursor) {
      const rawStream = intlcon.queryStream(
        { sql: query.sql, rowsAsArray },
        params,
      );
      const fieldsPromise = new Promise<any[]>((resolve, reject) => {
        rawStream.once('fields', (f: any[]) => resolve(f));
        rawStream.once('error', reject);
      });
      const cursor = new MariadbCursor(rawStream, { rowType });
      out.fields = this._convertFields(await fieldsPromise);
      out.rowType = rowType;
      out.cursor = cursor;
      return out;
    }

    // MariaDB has no UPDATE ... RETURNING (only INSERT/DELETE), so the
    // dialect strips RETURNING there and it must be emulated with a
    // follow-up SELECT reusing the original WHERE clause - the same
    // approach @sqb/mysql uses for every statement type.
    if (query.returningFields && /^\s*update\b/i.test(query.sql)) {
      const info: any = await intlcon.execute(
        { sql: query.sql, rowsAsArray },
        params,
      );
      if (query.autoCommit) await this.commit();
      out.rowsAffected = info.affectedRows;

      if (out.rowsAffected === 1) {
        const m = query.sql.match(/^\s*update\s+("?\w+"?)/i);
        const wm = query.sql.match(/\bwhere\b([\s\S]+)$/i);
        if (m && wm) {
          const table = m[1].replace(/"/g, '');
          const selectFields = query.returningFields.map(
            x => x.field + (x.alias ? ' as ' + x.alias : ''),
          );
          const sql = `select ${selectFields.join(',')} from ${table} where ${wm[1]}`;
          await this._fillSelectResult(out, sql, params, query);
        }
      }
      return out;
    }

    const result: any = await intlcon.execute(
      { sql: query.sql, rowsAsArray },
      params,
    );
    if (query.autoCommit) await this.commit();

    if (Array.isArray(result)) {
      // A RETURNING clause on INSERT/DELETE (or a plain SELECT) makes the
      // server respond with a result set instead of an OK packet - no
      // follow-up SELECT is needed to read back inserted/deleted rows.
      out.fields = this._convertFields(result.meta);
      out.rowType = rowType;
      out.rows = query.fetchRows ? result.slice(0, query.fetchRows) : result;
      if (query.returningFields) out.rowsAffected = result.length;
    } else {
      out.rowsAffected = result.affectedRows;
    }
    return out;
  }

  private async _fillSelectResult(
    out: Adapter.Response,
    sql: string,
    params: Record<string, any> | undefined,
    query: QueryRequest,
  ) {
    assertDefined(this.intlcon);
    const rowsAsArray = !query.objectRows;
    const result: any = await this.intlcon.execute(
      { sql, rowsAsArray },
      params,
    );
    out.fields = this._convertFields(result.meta);
    out.rowType = query.objectRows ? 'object' : 'array';
    out.rows = result;
  }

  private _convertFields(fields: any[]) {
    const result: Adapter.Field[] = [];
    for (const f of fields) {
      const t = typeMap[f.type] || { dataType: 'UNKNOWN', jsType: 'any' };
      result.push({
        fieldName: f.name(),
        dataType: t.dataType,
        jsType: t.jsType,
        _inf: f,
      });
    }
    return result;
  }
}

function assertDefined(d: unknown): asserts d {
  if (d == null) throw new Error('DB session is closed');
}
