import type { Adapter, RowType } from '@sqb/connect';
import type { NativeColumnInfo } from './drivers/types.js';

/**
 * `@sqb/connect` {@link Adapter.Cursor} wrapping a `NativeStatement`'s
 * synchronous `iterate()` result: `fetch(n)` pulls up to `n` rows at a
 * time, converting each row to an array (column-ordered via the
 * statement's column metadata) when `rowType` is `'array'`.
 */
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

  /** Stops consuming the iterator by dropping it - SQLite's synchronous iterator has no `close()`/`return()` of its own that needs calling. */
  async close(): Promise<void> {
    this._iterator = undefined;
  }

  /** Pulls up to `nRows` more rows from the iterator, or `undefined` once it's exhausted. */
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
