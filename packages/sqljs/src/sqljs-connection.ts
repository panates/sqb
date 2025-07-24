import { Adapter, QueryRequest } from '@sqb/connect';
import { Database, Statement } from 'sql.js';
import { SqljsCursor } from './sqljs-cursor.js';

export class SqljsConnection implements Adapter.Connection {
  private intlcon?: Database;

  constructor(
    db: Database,
    private _onClose: Function,
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
      this.intlcon.exec('BEGIN TRANSACTION;');
    } catch (e) {
      if (e instanceof Error && e.message.match(/within a transaction/)) return;
      throw e;
    }
  }

  async commit(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('COMMIT;');
    } catch (e) {
      if (e instanceof Error && e.message.match(/no transaction/)) return;
      throw e;
    }
  }

  async rollback(): Promise<void> {
    assertDefined(this.intlcon);
    try {
      this.intlcon.exec('ROLLBACK;');
    } catch (e) {
      if (e instanceof Error && e.message.match(/no transaction/)) return;
      throw e;
    }
  }

  async test(): Promise<void> {
    assertDefined(this.intlcon);
    this.intlcon.exec('select 1');
  }

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

function assertDefined(d: unknown): asserts d {
  if (d == null) throw new Error('Invalid data');
}
