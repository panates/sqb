import type { Adapter, RowType } from '@sqb/connect';
import type { Query as RawQuery } from 'mysql2';

export class MysqlCursor implements Adapter.Cursor {
  private _iterator?: AsyncIterableIterator<any>;
  private readonly _rowType: RowType;

  constructor(
    rawQuery: RawQuery,
    opts: {
      rowType: RowType;
    },
  ) {
    this._rowType = opts.rowType;
    this._iterator = rawQuery.stream()[Symbol.asyncIterator]();
  }

  get isClosed() {
    return !this._iterator;
  }

  get rowType(): RowType {
    return this._rowType;
  }

  async close(): Promise<void> {
    this._iterator = undefined;
  }

  async fetch(nRows: number): Promise<any[] | undefined> {
    if (!this._iterator) return undefined;
    const rows: any[] = [];
    while (nRows-- > 0) {
      const r = await this._iterator.next();
      if (r.done) {
        this._iterator = undefined;
        break;
      }
      rows.push(r.value);
    }
    return rows.length ? rows : undefined;
  }
}
