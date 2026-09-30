import type { Adapter, QueryRequest } from '@sqb/connect';
import type { Connection as MysqlDriverConnection } from 'mysql2/promise';
import { MysqlCursor } from './mysql-cursor.js';

/** Maps the `mysql2` driver's numeric column type codes to SQB's portable `{ dataType, jsType }` pair. */
const typeCodeMap: Record<number, { dataType: string; jsType: string }> = {
  0: { dataType: 'DECIMAL', jsType: 'number' },
  1: { dataType: 'TINYINT', jsType: 'number' },
  2: { dataType: 'SMALLINT', jsType: 'number' },
  3: { dataType: 'INT', jsType: 'number' },
  4: { dataType: 'FLOAT', jsType: 'number' },
  5: { dataType: 'DOUBLE', jsType: 'number' },
  7: { dataType: 'TIMESTAMP', jsType: 'Date' },
  8: { dataType: 'BIGINT', jsType: 'number' },
  9: { dataType: 'MEDIUMINT', jsType: 'number' },
  10: { dataType: 'DATE', jsType: 'Date' },
  11: { dataType: 'TIME', jsType: 'string' },
  12: { dataType: 'DATETIME', jsType: 'Date' },
  13: { dataType: 'YEAR', jsType: 'number' },
  16: { dataType: 'BIT', jsType: 'Buffer' },
  245: { dataType: 'JSON', jsType: 'string' },
  246: { dataType: 'DECIMAL', jsType: 'number' },
  247: { dataType: 'ENUM', jsType: 'string' },
  248: { dataType: 'SET', jsType: 'string' },
  249: { dataType: 'TINYBLOB', jsType: 'Buffer' },
  250: { dataType: 'MEDIUMBLOB', jsType: 'Buffer' },
  251: { dataType: 'LONGBLOB', jsType: 'Buffer' },
  252: { dataType: 'BLOB', jsType: 'Buffer' },
  253: { dataType: 'VARCHAR', jsType: 'string' },
  254: { dataType: 'CHAR', jsType: 'string' },
  255: { dataType: 'GEOMETRY', jsType: 'Buffer' },
};

/**
 * Table name -> `AUTO_INCREMENT` column name cache, used to emulate
 * `INSERT ... RETURNING` (MySQL has no `ROWID`/rowid equivalent, so the PK
 * column name must be known to re-select the row that was just inserted).
 * Populated by {@link MysqlConnection._getAutoIncrementColumn}.
 */
const autoIncrementColumnCache = new Map<string, string>();

/**
 * `@sqb/connect` {@link Adapter.Connection} wrapping a raw `mysql2` driver
 * connection: translates `QueryRequest`s into driver calls (including
 * cursor-mode streaming and `RETURNING`-on-`INSERT`/`UPDATE` emulation,
 * since MySQL supports neither natively) and normalizes results/column
 * metadata back into SQB's portable shape.
 */
export class MysqlConnection implements Adapter.Connection {
  private intlcon?: MysqlDriverConnection;
  private _inTransaction = false;

  constructor(conn: MysqlDriverConnection) {
    this.intlcon = conn;
  }

  get sessionId(): any {
    return (this.intlcon as any)?.connection?.threadId;
  }

  /** Forcibly destroys the underlying connection - see the inline comment for why not a graceful `end()`. */
  async close() {
    if (!this.intlcon) return;
    const conn = this.intlcon;
    this.intlcon = undefined;
    // destroy() (not end()) because a cursor's stream may not have been
    // fully consumed; end() waits for all in-flight commands to finish
    // and would hang in that case.
    conn.destroy();
  }

  /** Rolls back any open transaction, readying the connection to be pooled/reused. */
  async reset() {
    return this.rollback();
  }

  /** Begins a transaction (`BEGIN`). */
  async startTransaction(): Promise<void> {
    assertDefined(this.intlcon);
    // MySQL implicitly commits any already-active transaction when BEGIN is
    // issued again, so no "already in transaction" guard is needed here.
    await this.intlcon.beginTransaction();
    this._inTransaction = true;
  }

  /** Commits the current transaction. */
  async commit(): Promise<void> {
    assertDefined(this.intlcon);
    // COMMIT outside of an active transaction is a no-op in MySQL.
    await this.intlcon.commit();
    this._inTransaction = false;
  }

  /** Rolls back the current transaction. */
  async rollback(): Promise<void> {
    assertDefined(this.intlcon);
    await this.intlcon.rollback();
    this._inTransaction = false;
  }

  getInTransaction(): boolean {
    return this._inTransaction;
  }

  /** Validates the connection with a trivial `SELECT 1`. */
  async test(): Promise<void> {
    assertDefined(this.intlcon);
    await this.intlcon.query('select 1');
  }

  /**
   * Executes one query. For an `INSERT`/`UPDATE` with `returningFields`,
   * runs the statement then a synthesized follow-up `SELECT` to emulate
   * `RETURNING` (MySQL has none): an `INSERT` is matched back by its
   * `AUTO_INCREMENT` id (looked up once per table via
   * {@link _getAutoIncrementColumn} and cached), an `UPDATE` by reusing
   * the original `WHERE` clause - `DELETE` isn't emulated here since
   * there's nothing left to re-select afterward. In cursor mode, wraps
   * the driver's streaming query in a {@link MysqlCursor}. Otherwise
   * executes directly, reading result rows/metadata off the driver's
   * response.
   */
  async execute(query: QueryRequest): Promise<Adapter.Response> {
    assertDefined(this.intlcon);
    const intlcon = this.intlcon;
    // MySQL runs in autocommit mode by default; an explicit BEGIN is only
    // needed once per logical transaction. Re-issuing BEGIN while already
    // in a transaction would silently commit it early (MySQL semantics),
    // so it must be guarded with _inTransaction rather than called
    // unconditionally.
    if (!query.autoCommit && !this._inTransaction)
      await this.startTransaction();

    const params = query.params;
    const out: Adapter.Response = {};

    const m = query.sql.match(
      /\b(insert into|update|delete from)\b ("?\w+"?)/i,
    );
    if (m) {
      const [info] = (await intlcon.execute(query.sql, params)) as any;
      out.rowsAffected = info.affectedRows;
      if (query.autoCommit) await this.commit();

      if (out.rowsAffected === 1 && query.returningFields) {
        const table = m[2].replace(/"/g, '');
        const selectFields = query.returningFields.map(
          x => x.field + (x.alias ? ' as ' + x.alias : ''),
        );
        let sql = `select ${selectFields.join(',')} from ${table}\n`;
        const stmtType = m[1].toLowerCase();
        if (stmtType === 'insert into') {
          const pkColumn = await this._getAutoIncrementColumn(table);
          if (pkColumn && info.insertId) {
            sql += `where ${pkColumn} = ${info.insertId}`;
            await this._fillSelectResult(out, sql, undefined, query);
          }
          return out;
        }
        if (stmtType === 'update') {
          const m2 = query.sql.match(/where (.+)/i);
          sql += m2 ? ' where ' + m2[1] : '';
          await this._fillSelectResult(out, sql, params, query);
          return out;
        }
      }
      return out;
    }

    const rowsAsArray = !query.objectRows;
    const rowType = query.objectRows ? 'object' : 'array';

    if (query.cursor) {
      const rawQuery = (intlcon as any).connection.query(
        { sql: query.sql, rowsAsArray },
        params,
      );
      // .stream() must be called synchronously, right after the query is
      // created, before awaiting anything — otherwise mysql2 buffers rows
      // in its default (non-streaming) mode and the stream never emits.
      const fieldsPromise = new Promise<any[]>((resolve, reject) => {
        rawQuery.on('fields', (f: any[]) => resolve(f));
        rawQuery.on('error', reject);
      });
      const cursor = new MysqlCursor(rawQuery, { rowType });
      out.fields = this._convertFields(await fieldsPromise);
      out.rowType = rowType;
      out.cursor = cursor;
      return out;
    }

    const [rows, fields] = (await intlcon.execute(
      { sql: query.sql, rowsAsArray } as any,
      params,
    )) as any;
    if (fields) {
      out.fields = this._convertFields(fields);
      out.rowType = rowType;
      out.rows = query.fetchRows ? rows.slice(0, query.fetchRows) : rows;
    }
    return out;
  }

  /** Looks up (and caches, in {@link autoIncrementColumnCache}) the `AUTO_INCREMENT` column name for `table`, used to re-select a just-inserted row when emulating `RETURNING`. */
  private async _getAutoIncrementColumn(
    table: string,
  ): Promise<string | undefined> {
    const cached = autoIncrementColumnCache.get(table);
    if (cached) return cached;
    assertDefined(this.intlcon);
    const [rows] = (await this.intlcon.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS ' +
        'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ' +
        "AND EXTRA LIKE '%auto_increment%' LIMIT 1",
      [table],
    )) as any;
    const column = rows[0]?.COLUMN_NAME;
    if (column) autoIncrementColumnCache.set(table, column);
    return column;
  }

  /** Runs a synthesized `SELECT` and copies its rows/fields onto `out` - used to emulate `RETURNING` on `INSERT`/`UPDATE`. */
  private async _fillSelectResult(
    out: Adapter.Response,
    sql: string,
    params: Record<string, any> | undefined,
    query: QueryRequest,
  ) {
    assertDefined(this.intlcon);
    const rowsAsArray = !query.objectRows;
    const [rows, fields] = (await this.intlcon.execute(
      { sql, rowsAsArray } as any,
      params,
    )) as any;
    out.fields = this._convertFields(fields);
    out.rowType = query.objectRows ? 'object' : 'array';
    out.rows = rows;
  }

  /** Converts the driver's column metadata into SQB's portable {@link Adapter.Field} shape via {@link typeCodeMap}. */
  private _convertFields(fields: any[]) {
    const result: Adapter.Field[] = [];
    for (const f of fields) {
      const t = typeCodeMap[f.type] || { dataType: 'UNKNOWN', jsType: 'any' };
      result.push({
        fieldName: f.name,
        dataType: t.dataType,
        jsType: t.jsType,
        _inf: f,
      });
    }
    return result;
  }
}

/** Throws if the connection has already been closed. */
function assertDefined(d: unknown): asserts d {
  if (d == null) throw new Error('DB session is closed');
}
