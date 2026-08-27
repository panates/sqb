import type { Adapter, QueryRequest } from '@sqb/connect';
import type {
  NativeColumnInfo,
  NativeDatabase,
  NativeStatement,
} from './drivers/types.js';
import { SqliteCursor } from './sqlite-cursor.js';

export class SqliteConnection implements Adapter.Connection {
  private intlcon?: NativeDatabase;

  constructor(
    db: NativeDatabase,
    private _onClose: () => void | Promise<void>,
  ) {
    this.intlcon = db;
  }

  get sessionId(): any {
    return 0;
  }

  async close() {
    if (this.intlcon) {
      this.intlcon = undefined;
      await this._onClose();
    }
  }

  async reset() {
    return this.rollback();
  }

  async startTransaction(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('BEGIN');
    } catch (e) {
      if (e instanceof Error && e.message.match(/within a transaction/)) return;
      throw e;
    }
  }

  async commit(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('COMMIT');
    } catch (e) {
      if (e instanceof Error && e.message.match(/no transaction/)) return;
      throw e;
    }
  }

  async rollback(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('ROLLBACK');
    } catch (e) {
      if (e instanceof Error && e.message.match(/no transaction/)) return;
      throw e;
    }
  }

  getInTransaction(): boolean {
    return !!this.intlcon?.inTransaction;
  }

  async test(): Promise<void> {
    assertDefined(this.intlcon);
    this.intlcon.exec('select 1');
  }

  async execute(query: QueryRequest): Promise<Adapter.Response> {
    assertDefined(this.intlcon);
    const intlcon = this.intlcon;
    if (!query.autoCommit) await this.startTransaction();

    const params = query.params ? mapParams(query.params) : undefined;
    const out: Adapter.Response = {};

    const m = query.sql.match(
      /\b(insert into|update|delete from)\b ("?\w+"?)/i,
    );
    if (m) {
      const stmt = intlcon.prepare(query.sql);
      const info = stmt.run(params);
      out.rowsAffected = info.changes;
      if (query.autoCommit) await this.commit();

      if (out.rowsAffected === 1 && query.returningFields) {
        const selectFields = query.returningFields.map(
          x => x.field + (x.alias ? ' as ' + x.alias : ''),
        );
        let sql = `select ${selectFields.join(',')} from ${m[2]}\n`;
        const stmtType = m[1].toLowerCase();
        if (stmtType === 'insert into') {
          sql += 'where rowid = ' + info.lastInsertRowid;
          const selStmt = intlcon.prepare(sql);
          this._fillSelectResult(out, selStmt, selStmt.all(), query);
          return out;
        }
        if (stmtType === 'update') {
          const m2 = query.sql.match(/where (.+)/i);
          sql += m2 ? ' where ' + m2[1] : '';
          const selStmt = intlcon.prepare(sql);
          this._fillSelectResult(out, selStmt, selStmt.all(params), query);
          return out;
        }
      }
      return out;
    }

    const stmt = intlcon.prepare(query.sql);
    const rowType = query.objectRows ? 'object' : 'array';
    const iterator = stmt.iterate(params);
    const columns = stmt.columns();
    if (!columns.length) return out;

    out.fields = this._convertFields(columns);
    out.rowType = rowType;
    const cursor = new SqliteCursor(iterator, { rowType, columns });
    if (query.cursor) {
      out.cursor = cursor;
    } else {
      out.rows = await cursor.fetch(query.fetchRows || 100);
    }
    return out;
  }

  private _fillSelectResult(
    out: Adapter.Response,
    stmt: NativeStatement,
    rows: Record<string, any>[],
    query: QueryRequest,
  ) {
    const columns = stmt.columns();
    out.fields = this._convertFields(columns);
    out.rowType = query.objectRows ? 'object' : 'array';
    out.rows =
      out.rowType === 'array'
        ? rows.map(r => columns.map(c => r[c.name]))
        : rows;
  }

  private _convertFields(columns: NativeColumnInfo[]) {
    const result: Adapter.Field[] = [];
    for (const c of columns) {
      const { dataType, jsType } = mapDeclaredType(c.declaredType);
      result.push({
        fieldName: c.name,
        dataType,
        jsType,
        _inf: c,
      });
    }
    return result;
  }
}

function assertDefined(d: unknown): asserts d {
  if (d == null) throw new Error('DB session is closed');
}

function mapParams(params: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(params)) out[':' + k] = params[k];
  return out;
}

/**
 * Maps a SQLite declared column type to a {dataType, jsType} pair using
 * SQLite's type affinity rules (https://www.sqlite.org/datatype3.html).
 */
function mapDeclaredType(declaredType: string | null): {
  dataType: string;
  jsType: string;
} {
  if (!declaredType) return { dataType: 'UNKNOWN', jsType: 'any' };
  const t = declaredType.toUpperCase();
  if (t.includes('INT')) return { dataType: t, jsType: 'number' };
  if (t.includes('CHAR') || t.includes('CLOB') || t.includes('TEXT'))
    return { dataType: t, jsType: 'string' };
  if (t.includes('BLOB')) return { dataType: t, jsType: 'Buffer' };
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB'))
    return { dataType: t, jsType: 'number' };
  return { dataType: t, jsType: 'number' };
}
