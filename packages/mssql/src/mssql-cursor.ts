import type { Adapter, RowType } from '@sqb/connect';
import type { Request } from 'mssql';

/**
 * `@sqb/connect` {@link Adapter.Cursor} bridging the `mssql` driver's
 * event-based streaming (`request.stream = true`, `'row'`/`'done'`/
 * `'error'` events) into the pull-based `Adapter.Cursor` interface: rows
 * are buffered as they arrive (with basic backpressure, pausing the
 * request once the buffer grows too large) and handed out on demand by
 * `fetch(n)`.
 */
export class MssqlCursor implements Adapter.Cursor {
  private readonly _rowType: RowType;
  private _request?: Request;
  private _buffer: any[] = [];
  private _done = false;
  private _error?: Error;
  private _waiter?: () => void;

  constructor(
    request: Request,
    opts: {
      rowType: RowType;
    },
  ) {
    this._rowType = opts.rowType;
    this._request = request;
    request.on('row', (row: any) => {
      this._buffer.push(this._rowType === 'array' ? Object.values(row) : row);
      // Basic backpressure: pause once a reasonable amount is buffered,
      // resume once fetch() has drained it below the threshold.
      if (this._buffer.length >= 100) request.pause();
      this._notify();
    });
    request.on('error', (err: Error) => {
      this._error = err;
      this._notify();
    });
    request.on('done', () => {
      this._done = true;
      this._notify();
    });
  }

  get isClosed() {
    return !this._request;
  }

  get rowType(): RowType {
    return this._rowType;
  }

  /** Cancels the underlying streaming request, stopping further rows from being pulled. */
  async close(): Promise<void> {
    if (!this._request) return;
    const request = this._request;
    this._request = undefined;
    request.cancel();
  }

  /**
   * Waits until at least `nRows` are buffered, the stream is done, or it
   * errored, then returns up to `nRows` buffered rows (or `undefined` once
   * exhausted). Resumes the request if pausing had kicked in for
   * backpressure and the buffer has drained back below the threshold.
   */
  async fetch(nRows: number): Promise<any[] | undefined> {
    if (!this._request) return undefined;
    while (this._buffer.length < nRows && !this._done && !this._error) {
      await new Promise<void>(resolve => (this._waiter = resolve));
    }
    if (this._error) {
      const err = this._error;
      this._request = undefined;
      throw err;
    }
    const rows = this._buffer.splice(0, nRows);
    if (this._request && this._buffer.length < 100) this._request.resume();
    if (this._done && !this._buffer.length) this._request = undefined;
    return rows.length ? rows : undefined;
  }

  /** Wakes up a pending `fetch()` call, if one is waiting on new data. */
  private _notify() {
    if (this._waiter) {
      const w = this._waiter;
      this._waiter = undefined;
      w();
    }
  }
}
