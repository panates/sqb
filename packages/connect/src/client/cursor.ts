import _debug from 'debug';
import DoublyLinked from 'doublylinked';
import { TaskQueue } from 'power-tasks';
import { coerceToInt } from 'putil-varhelpers';
import { AsyncEventEmitter, TypedEventEmitterClass } from 'strict-typed-events';
import type { Adapter } from './adapter.js';
import { CursorStream, type CursorStreamOptions } from './cursor-stream.js';
import type { FieldInfoMap } from './field-info-map.js';
import {
  callFetchHooks,
  normalizeRowsToArrayRows,
  normalizeRowsToObjectRows,
} from './helpers.js';
import type { SqbConnection } from './sqb-connection.js';
import type { ObjectRow, QueryRequest } from './types.js';

const debug = _debug('sqb:cursor');

/** Events emitted by a {@link Cursor}. */
interface CursorEvents {
  /** Emitted once the cursor is closed. */
  close: () => void;
  /** Emitted when fetching rows from the driver fails. */
  error: (error: unknown) => void;
  /** Emitted when the cursor reaches the end of the result set. */
  eof: () => void;
  /** Emitted when the cursor is moved back before the first row via `reset()`. */
  reset: () => void;
  /** Emitted after the cursor's position changes (unless the move was silent). */
  move: (row: any, rowNum: number) => void;
  /** Emitted once per row as new rows are fetched from the driver. */
  fetch: (row: any, rowNum: number) => void;
}

/**
 * A unidirectional (optionally cache-backed bidirectional) result-set
 * cursor, returned when a query is executed with `{ cursor: true }`. Wraps
 * the driver-level {@link Adapter.Cursor}, adding row prefetching/caching,
 * seeking, and (via {@link Cursor.toStream}) a Node `Readable` stream.
 *
 * A cursor keeps its owning connection open (or, if acquired through
 * `SqbClient.execute()`, keeps the pooled connection retained) until it's
 * closed - always `close()` a cursor once done with it.
 */
export class Cursor extends TypedEventEmitterClass<CursorEvents>(
  AsyncEventEmitter,
) {
  private readonly _connection: SqbConnection;
  private readonly _fields: FieldInfoMap;
  private readonly _prefetchRows: number;
  private readonly _request: QueryRequest;

  private _intlcur?: Adapter.Cursor;
  private _taskQueue = new TaskQueue();
  private _fetchCache = new DoublyLinked();
  private _rowNum = 0;
  private _fetchedAll = false;
  private _fetchedRows = 0;
  private _row: any;
  private _cache?: DoublyLinked;

  constructor(
    connection: SqbConnection,
    fields: FieldInfoMap,
    adapterCursor: Adapter.Cursor,
    request: QueryRequest,
  ) {
    super();
    this._connection = connection;
    this._intlcur = adapterCursor;
    this._fields = fields;
    this._request = request;
    this._prefetchRows = request?.fetchRows || 100;
  }

  /**
   * Returns the Connection instance
   */
  get connection() {
    return this._connection;
  }

  /**
   * Returns if cursor is before first record.
   */
  get isBof(): boolean {
    return !this._rowNum;
  }

  /**
   * Returns if cursor is closed.
   */
  get isClosed(): boolean {
    return !this._intlcur;
  }

  /**
   * Returns if cursor is after last record.
   */
  get isEof(): boolean {
    return this._fetchedAll && this.rowNum > this._fetchedRows;
  }

  /**
   * Returns number of fetched record count from database.
   */
  get fetchedRows(): number {
    return this._fetchedRows;
  }

  /**
   * Returns object instance which contains information about fields.
   */
  get fields(): FieldInfoMap {
    return this._fields;
  }

  /**
   * Returns current row
   */
  get row(): any {
    return this._row;
  }

  /**
   * Returns current row number.
   */
  get rowNum(): number {
    return this._rowNum;
  }

  /**
   * Enables the in-memory row cache, which is what makes backward seeking
   * (`prev()`, a negative `seek()`/`moveTo()` step, or `reset()`) possible -
   * without it, the cursor can only move forward. Must be called before any
   * rows have been fetched.
   *
   * @throws {Error} If rows have already been fetched.
   */
  cached(): void {
    if (this.fetchedRows)
      throw new Error('Cache can be enabled before fetching rows');
    if (!this._cache) this._cache = new DoublyLinked();
  }

  /**
   * Closes cursor
   */
  async close(): Promise<void> {
    if (!this._intlcur) return;
    try {
      await this._intlcur.close();
      this._intlcur = undefined;
      debug('close');
      this.emit('close');
    } catch (err) {
      debug('close-error:', err);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * If cache is enabled, this call fetches and keeps all records in the internal cache.
   * Otherwise it throws error. Once all all records fetched,
   * you can close Cursor safely and can continue to use it in memory.
   * Returns number of fetched rows
   *
   * @throws {Error} If the cache wasn't enabled via {@link Cursor.cached}.
   */
  async fetchAll(): Promise<number> {
    if (!this._cache)
      throw new Error('fetchAll() method needs cache to be enabled');
    const n = this.rowNum;
    const v = await this._seek(Number.MAX_SAFE_INTEGER, true);
    await this._seek(n - this.rowNum, true);
    return v;
  }

  /**
   * Moves cursor to given row number.
   * cursor can move both forward and backward if cache enabled.
   * Otherwise it throws error.
   *
   * @throws {Error} If moving backward is required but the cache wasn't enabled via {@link Cursor.cached}.
   */
  async moveTo(rowNum: number): Promise<ObjectRow> {
    await this._seek(rowNum - this.rowNum);
    return this.row;
  }

  /**
   * Moves cursor forward by one row and returns that row.
   * And also it allows iterating over rows easily.
   */
  async next(): Promise<ObjectRow> {
    debug('next');
    await this._seek(1);
    return this.row;
  }

  /**
   *  Moves cursor back by one row and returns that row.
   *  And also it allows iterating over rows easily.
   *
   * @throws {Error} If the cache wasn't enabled via {@link Cursor.cached}.
   */
  async prev(): Promise<ObjectRow> {
    await this._seek(-1);
    return this.row;
  }

  /**
   * Moves cursor before first row. (Required cache enabled)
   *
   * @throws {Error} If the cache wasn't enabled via {@link Cursor.cached}.
   */
  reset() {
    if (!this._cache)
      throw new Error('reset() method needs cache to be enabled');
    this._cache.reset();
    this._rowNum = 0;
    this.emit('reset');
  }

  /**
   * Moves cursor by given step. If caching is enabled,
   * cursor can move both forward and backward. Otherwise it throws error.
   *
   * @param step - Number of rows to move; positive moves forward, negative moves backward (requires the cache to be enabled).
   * @throws {Error} If moving backward is required but the cache wasn't enabled via {@link Cursor.cached}.
   */
  async seek(step: number): Promise<ObjectRow> {
    await this._seek(step);
    return this.row;
  }

  /**
   * Wraps this cursor in a Node `Readable` stream, emitting either row
   * objects (`objectMode: true`) or a streamed JSON array of rows.
   */
  toStream(options?: CursorStreamOptions): CursorStream {
    return new CursorStream(this, options);
  }

  toString() {
    return '[object ' + Object.getPrototypeOf(this).constructor.name + ']';
  }

  inspect() {
    return this.toString();
  }

  /**
   * Internal implementation of row movement, shared by `moveTo`/`next`/
   * `prev`/`seek`: walks the cache (if enabled), then the prefetch buffer,
   * fetching more rows from the driver via {@link Cursor._fetchRows} as
   * needed. Not intended to be called directly - use the public movement
   * methods instead.
   *
   * @param silent - When true, suppresses the `'move'` event for this step (used by `fetchAll()`'s own bookkeeping).
   */
  async _seek(step: number, silent?: boolean): Promise<number> {
    step = coerceToInt(step, 0);
    if (!step || (step > 0 && this.isClosed)) return this.rowNum;

    if (step < 0 && !this._cache)
      throw new Error('To move cursor back, it needs cache to be enabled');

    const _this = this;
    await this._taskQueue
      .enqueue(async () => {
        /* If moving backward */
        if (step < 0) {
          /* Seek cache */
          while (step < 0 && _this._cache?.cursor) {
            _this._row = _this._cache.prev();
            _this._rowNum--;
            step++;
          }
          return;
        }

        while (step > 0) {
          if (_this.isEof) return;
          /* Seek cache */
          while (
            step > 0 &&
            _this._cache &&
            (_this._row = _this._cache.next())
          ) {
            _this._rowNum++;
            step--;
          }

          /* Fetch from prefetch cache */
          while (step > 0 && (_this._row = _this._fetchCache.shift())) {
            _this._rowNum++;
            step--;
          }
          if (_this._fetchedAll) {
            _this._rowNum++;
            _this.emit('eof');
            return;
          }

          if (!step || _this._fetchedAll) return;

          await _this._fetchRows();
        }
      })
      .toPromise();
    if (!silent) this.emit('move', this.row, this._rowNum);
    return this._rowNum;
  }

  /**
   * Fetches the next batch of rows (up to `_prefetchRows`) from the driver
   * cursor, normalizes and caches them, and emits a `'fetch'` event per
   * row - or marks the cursor exhausted and closes it once the driver
   * returns no more rows. Not intended to be called directly.
   *
   * @throws {Error} If the cursor is already closed.
   */
  async _fetchRows(): Promise<void> {
    if (!this._intlcur) throw new Error('Cursor is closed');
    let rows = await this._intlcur.fetch(this._prefetchRows);
    if (rows && rows.length) {
      debug('Fetched %d rows from database', rows.length);
      // Normalize rows
      rows = this._request.objectRows
        ? normalizeRowsToObjectRows(
            this._fields,
            this._intlcur.rowType,
            rows,
            this._request,
          )
        : normalizeRowsToArrayRows(
            this._fields,
            this._intlcur.rowType,
            rows,
            this._request,
          );
      callFetchHooks(rows, this._request);
      for (const [idx, row] of rows.entries()) {
        this.emit('fetch', row, this._rowNum + idx + 1);
      }
      /* Add rows to cache */
      if (this._cache) {
        this._cache.push(...rows);
      } else this._fetchCache.push(...rows);

      this._fetchedRows += rows.length;
      return;
    }
    this._fetchedAll = true;
    return this.close();
  }
}
