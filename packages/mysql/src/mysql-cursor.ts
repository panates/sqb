import type { Adapter, RowType } from '@sqb/connect';
import type { Query as RawQuery } from 'mysql2';

/**
 * `@sqb/connect` {@link Adapter.Cursor} wrapping the `mysql2` driver's
 * `Query.stream()` result: consumes it via its async iterator, `fetch(n)`
 * pulling up to `n` rows at a time.
 */
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

  /** Stops consuming the stream by dropping the iterator - `mysql2`'s stream has no `close()`/`destroy()` of its own to call. */
  async close(): Promise<void> {
    this._iterator = undefined;
  }

  /** Pulls up to `nRows` more rows from the stream, or `undefined` once it's exhausted. */
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
