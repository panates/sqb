import type { Adapter, RowType } from '@sqb/connect';
import type { NativeColumnInfo } from './drivers/types.js';

export class SqliteCursor implements Adapter.Cursor {
  private _iterator?: IterableIterator<Record<string, any>>;
  private readonly _rowType: RowType;
  private readonly _columns: NativeColumnInfo[];

  constructor(
    iterator: IterableIterator<Record<string, any>>,
    opts: {
      rowType: RowType;
      columns: NativeColumnInfo[];
    },
  ) {
    this._iterator = iterator;
    this._rowType = opts.rowType;
    this._columns = opts.columns;
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
      const r = this._iterator.next();
      if (r.done) {
        this._iterator = undefined;
        break;
      }
      rows.push(
        this._rowType === 'array'
          ? this._columns.map(c => r.value[c.name])
          : r.value,
      );
    }
    return rows.length ? rows : undefined;
  }
}
