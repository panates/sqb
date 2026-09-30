import type { Adapter, RowType } from '@sqb/connect';

/**
 * `@sqb/connect` {@link Adapter.Cursor} wrapping a `sql.js` prepared
 * `Statement`: `fetch(n)` steps the statement up to `n` times, reading
 * each row as an object or array depending on `rowType`.
 */
export class SqljsCursor implements Adapter.Cursor {
  private _stmt?: any;
  private readonly _rowType: RowType;

  constructor(
    stmt: any,
    opts: {
      rowType: RowType;
    },
  ) {
    this._rowType = opts.rowType;
    this._stmt = stmt;
  }

  get isClosed() {
    return !this._stmt;
  }

  get rowType(): RowType {
    return this._rowType;
  }

  /** Frees the underlying `sql.js` statement. A no-op if already closed. */
  async close(): Promise<void> {
    if (!this._stmt) return;
    this._stmt.free();
    this._stmt = undefined;
  }

  /** Steps the statement up to `nRows` times, collecting each resulting row (or stopping early once the statement is exhausted). */
  async fetch(nRows: number): Promise<any[] | undefined> {
    if (!this._stmt) return;
    const stmt = this._stmt;
    const rows: any[] = [];
    while (nRows-- && stmt.step()) {
      rows.push(this.rowType === 'object' ? stmt.getAsObject() : stmt.get());
    }
    return rows;
  }
}
