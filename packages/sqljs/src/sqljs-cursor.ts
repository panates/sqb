import { Adapter, RowType } from '@sqb/connect';

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

  async close(): Promise<void> {
    if (!this._stmt) return;
    this._stmt.free();
    this._stmt = undefined;
  }

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
