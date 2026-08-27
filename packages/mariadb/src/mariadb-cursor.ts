import type { Readable } from 'node:stream';
import type { Adapter, RowType } from '@sqb/connect';

export class MariadbCursor implements Adapter.Cursor {
  private _iterator?: AsyncIterableIterator<any>;
  private readonly _rowType: RowType;
  private readonly _stream: Readable;

  constructor(
    stream: Readable,
    opts: {
      rowType: RowType;
    },
  ) {
    this._rowType = opts.rowType;
    this._stream = stream;
    this._iterator = stream[Symbol.asyncIterator]();
  }

  get isClosed() {
    return !this._iterator;
  }

  get rowType(): RowType {
    return this._rowType;
  }

  async close(): Promise<void> {
    this._iterator = undefined;
    // mariadb's stream exposes a custom close() that stops pulling further
    // rows and resumes the underlying socket, so an early close doesn't
    // leave it paused mid-backpressure.
    (this._stream as any).close?.();
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
