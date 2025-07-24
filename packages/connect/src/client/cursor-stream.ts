import _debug from 'debug';
import { Readable } from 'stream';
import { Cursor } from './cursor.js';

export interface CursorStreamOptions {
  objectMode?: boolean;
  limit?: number;
}

const inspect = Symbol.for('nodejs.util.inspect.custom');
const debug = _debug('sqb:cursorstream');

export class CursorStream extends Readable {
  private readonly _cursor: Cursor;
  private readonly _objectMode?: boolean;
  private readonly _limit: number;
  private _rowNum = -1;
  private _eof = false;

  constructor(cursor: Cursor, options?: CursorStreamOptions) {
    super(options);

    this._cursor = cursor;
    this._objectMode = options?.objectMode;
    this._limit = options?.limit || Number.MAX_SAFE_INTEGER;

    this.on('end', () => {
      this.close().catch(() => false);
    });

    cursor.once('close', () => this.emit('close'));
    cursor.on('error', err => this.emit('error', err));
  }

  /**
   * Returns if stream is closed.
   */
  get isClosed(): boolean {
    return this._cursor.isClosed;
  }

  /**
   * Closes stream and releases the cursor
   */
  close(): Promise<void> {
    this.pause();
    this.unpipe();
    return this._cursor.close();
  }

  toString(): string {
    return '[object ' + Object.getPrototypeOf(this).constructor.name + ']';
  }

  [inspect]() {
    return this.toString();
  }

  _read() {
    if (this._rowNum >= this._limit) {
      this.pause();
      this.unpipe();
      this.emit('end');
      return;
    }
    this._cursor
      .next()
      .then(row => {
        if (this._eof) return this.push(null);
        let buf = '';
        if (this._rowNum < 0) {
          this._rowNum = 0;
          if (!this._objectMode) buf += '[';
        }
        if (!row) {
          this._eof = true;
          if (!this._objectMode) {
            buf += ']';
            this.push(buf);
          } else this.push(null);
          return;
        }
        this._rowNum++;
        if (this._objectMode) this.push(row);
        else {
          if (this._rowNum > 1) buf += ',';
          this.push(buf + JSON.stringify(row));
        }
      })
      .catch(err => {
        /* istanbul ignore next */
        if (typeof this.destroy == 'function') this.destroy(err);
        else this.emit('error', err);
        this.close().catch(() => 0);
      });
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    try {
      if (event === 'error' && !this.listenerCount('error')) return false;
      return super.emit(event, ...args);
    } catch (ignored) {
      debug('emit-error', ignored);
      return false;
    }
  }
}
