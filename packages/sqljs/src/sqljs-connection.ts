import type { Adapter, QueryRequest } from '@sqb/connect';
import type { Database, Statement } from 'sql.js';
import { SqljsCursor } from './sqljs-cursor.js';

/**
 * `@sqb/connect` {@link Adapter.Connection} wrapping a `sql.js` `Database`:
 * translates `QueryRequest`s into driver calls (including cursor-mode
 * iteration and `RETURNING`-on-`INSERT`/`UPDATE` emulation, since this
 * layer's SQL generation doesn't rely on SQLite's own `RETURNING` support)
 * and normalizes results/column metadata back into SQB's portable shape.
 */
export class SqljsConnection implements Adapter.Connection {
  private intlcon?: Database;

  constructor(
    db: Database,
    private _onClose: Function,
  ) {
    this.intlcon = db;
  }

  /** SQLite has no server-side session concept - always `0`. */
  get sessionId(): any {
    return 0;
  }

  /** Releases this connection's reference to the underlying `sql.js` database via the closer passed to the constructor (see {@link SqljsAdapter.connect}), closing the file database once no connection references it. */
  async close() {
    if (this.intlcon) {
      this.intlcon = undefined;
      await this._onClose();
    }
  }

  /** Rolls back any open transaction, readying the connection to be pooled/reused. */
  async reset() {
    return this.rollback();
  }

  /** Begins a transaction (`BEGIN TRANSACTION`), swallowing the driver's error for a transaction already being open rather than throwing. */
  async startTransaction(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('BEGIN TRANSACTION;');
    } catch (e) {
      if (e instanceof Error && e.message.match(/within a transaction/)) return;
      throw e;
    }
  }

  /** Commits the current transaction, swallowing the driver's error for no transaction being open rather than throwing. */
  async commit(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('COMMIT;');
    } catch (e) {
      if (e instanceof Error && e.message.match(/no transaction/)) return;
      throw e;
    }
  }

  /** Rolls back the current transaction, swallowing the driver's error for no transaction being open rather than throwing. */
  async rollback(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('ROLLBACK;');
    } catch (e) {
      if (e instanceof Error && e.message.match(/no transaction/)) return;
      throw e;
    }
  }

  /** Validates the connection with a trivial `SELECT 1`. */
  async test(): Promise<void> {
    assertDefined(this.intlcon);
    this.intlcon.exec('select 1');
  }

  /**
   * Executes one query. For an `INSERT`/`UPDATE` with `returningFields`,
   * emulates `RETURNING` (`sql.js` has none): an `INSERT` is matched back
   * via `last_insert_rowid()` and read directly with `exec()`; an `UPDATE`
   * is emulated by rewriting the request into a synthesized follow-up
   * `SELECT` reusing the original `WHERE` clause, which then falls through
   * to the normal query path below - `DELETE` isn't emulated here since
   * there's nothing left to re-select afterward. Otherwise prepares the
   * statement and wraps it in a {@link SqljsCursor} (returned directly in
   * cursor mode, or eagerly drained up to `fetchRows` rows otherwise,
   * freeing the statement once done).
   */
  async execute(query: QueryRequest): Promise<Adapter.Response> {
    assertDefined(this.intlcon);
    if (!query.autoCommit) await this.startTransaction();
    const out: Adapter.Response = {};
    let params;
    if (query.params) {
      const prms = query.params;
      params = Object.keys(prms).reduce((obj, k) => {
        obj[':' + k] = prms[k];
        return obj;
      }, {});
    }

    const m = query.sql.match(
      /\b(insert into|update|delete from)\b ("?\w+"?)/i,
    );
    if (m) {
      const stmt = this.intlcon.prepare(query.sql);
      stmt.run(params);
      stmt.free();
      out.rowsAffected = this.intlcon.getRowsModified();
      if (query.autoCommit) await this.commit();
      if (out.rowsAffected === 1 && query.returningFields) {
        const selectFields = query.returningFields.map(
          x => x.field + (x.alias ? ' as ' + x.alias : ''),
        );
        let sql = `select ${selectFields.join(',')} from ${m[2]}\n`;
        // Emulate insert into ... returning
        if (m[1].toLowerCase() === 'insert into') {
          sql += 'where rowid=last_insert_rowid();';
          const r: any[] = this.intlcon.exec(sql);
          if (r.length) {
            out.fields = this._convertFields(r[0].columns);
            out.rows = r[0].values;
            out.rowType = 'array';
          }
          return out;
        }
        // Emulate update ... returning
        if (m[1].toLowerCase() === 'update') {
          const m2 = query.sql.match(/where (.+)/);
          query = { ...query };
          query.sql = sql + (m2 ? ' where ' + m2[1] : '');
        } else return out;
      }
    }

    let stmt: Statement | undefined = this.intlcon.prepare(
      query.sql,
      query.params,
    );
    try {
      const colNames = stmt.getColumnNames();
      if (colNames && colNames.length) {
        out.fields = this._convertFields(colNames);
        const rowType = query.objectRows ? 'object' : 'array';
        out.rowType = rowType;
        const cursor = new SqljsCursor(stmt, { rowType });
        if (query.cursor) {
          out.cursor = cursor;
          stmt = undefined;
        } else out.rows = await cursor.fetch(query.fetchRows || 100);
      }
      return out;
    } finally {
      if (stmt) stmt.free();
    }
  }

  /** Converts `sql.js`'s bare column-name list into SQB's portable {@link Adapter.Field} shape - `sql.js` reports no type information per column, so `dataType`/`jsType` are always `'any'`. */
  private _convertFields(fields: string[]) {
    const result: any[] = [];
    for (let i = 0; i < fields.length; i++) {
      const v = fields[i];
      const o: Adapter.Field = {
        fieldName: v,
        dataType: 'any',
        jsType: 'any',
        _inf: { name: v },
      };
      result.push(o);
    }
    return result;
  }
}

/** Throws if the connection has already been closed. */
function assertDefined(d: unknown): asserts d {
  if (d == null) throw new Error('Invalid data');
}
