/* SQB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/sqb/
 */
'use strict';

/**
 * Module dependencies.
 * @private
 */
const debug = require('debug')('sqb:Cursor');
const EventEmitter = require('events').EventEmitter;
const TaskQueue = require('putil-taskqueue');
const DoublyLinked = require('doublylinked');
const CursorStream = require('./CursorStream');
const normalizeRows = require('../helper/normalizeRows');

const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

/**
 *
 * @class
 */

class Cursor extends EventEmitter {
  /**
   *
   * @param {PreparedQuery} prepared
   * @param {Object} response
   * @constructor
   */
  constructor(prepared, response) {
    super();
    this._taskQueue = new TaskQueue();
    this._fetchCache = new DoublyLinked();
    this._prepared = prepared;
    this._cursor = response.cursor;
    this._fields = response.fields;
    this._rowNum = 0;
    this._fetchedRows = 0;
    this._prefetchRows = prepared.options.fetchRows || 100;

    /* Cancel all awaiting tasks on error */
    this._taskQueue.on('error', () => this._taskQueue.clear());

    /*if (options.onFetch && options.onFetch.length)
      for (const fn of options.onFetch)
        this.on('fetch', fn);*/
    this.connection.acquire();
  }

  /**
   * Returns the Connection instance that connection owned by
   *
   * @return {Connection|*}
   */
  get connection() {
    return this._prepared.connection;
  }

  /**
   * Returns if cursor is before first record.
   *
   * @return {boolean}
   */
  get isBof() {
    return !this._rowNum;
  }

  /**
   * Returns if cursor is closed.
   *
   * @return {boolean}
   */
  get isClosed() {
    return !this._cursor;
  }

  /**
   * Returns if cursor is after last record.
   *
   * @return {boolean}
   */
  get isEof() {
    return this._fetchedAll && this.rowNum > this._fetchedRows;
  }

  /**
   * Returns number of fetched record count from database.
   *
   * @return {number|*}
   */
  get fetchedRows() {
    return this._fetchedRows;
  }

  /**
   * Returns object instance which contains information about fields.
   *
   * @return {Object}
   */
  get fields() {
    return this._fields;
  }

  /**
   * Returns current row
   *
   * @return {Object|null}
   */
  get row() {
    return this._row;
  }

  /**
   * Returns current row number.
   *
   * @return {number}
   */
  get rowNum() {
    return this._rowNum;
  }

  /**
   * Enables cache
   *
   * @return {undefined}
   * @public
   */
  cached() {
    if (this.fetchedRows)
      throw new Error('Cache can be enabled before fetching rows');
    this._cache = new DoublyLinked();
  }

  /**
   * Decrease reference count and close cursor when reach to zero
   *
   * @return {Promise}
   * @public
   */
  close() {
    if (this.isClosed)
      return Promise.resolve();
    return this._cursor.close().then(() => {
      this._cursor = null;
      debug('close');
      this.emitSafe('close');
      this.connection.release();
    }).catch(err => {
      debug('close-error:', err);
      this.emitSafe('error', err);
      throw err;
    });
  }

  /**
   * If cache is enabled, this call fetches and keeps all records in the internal cache.
   * Otherwise it throws error. Once all all records fetched,
   * you can close Cursor safely and can continue to use it in memory.
   *
   * @return {Promise}
   */
  fetchAll() {
    if (!this._cache)
      return Promise.reject(new Error('fetchAll() method needs cache to be enabled'));
    const n = this.rowNum;
    return this._seek(MAX_SAFE_INTEGER, true)
        .then(v => this._seek(n - this.rowNum, true).then(() => v));
  }

  /**
   * Moves cursor to given row number.
   * cursor can move both forward and backward if cache enabled.
   * Otherwise it throws error.
   *
   * @param {Integer} rowNum
   * @return {Promise<Integer>}
   */
  moveTo(rowNum) {
    return this._seek(rowNum - this.rowNum);
  }

  /**
   * Moves cursor forward by one row and returns that row.
   * And also it allows iterating over rows easily.
   *
   * @return {Promise<Integer>}
   */
  next() {
    return this._seek(1).then(() => this.row);
  }

  /**
   *  Moves cursor back by one row and returns that row.
   *  And also it allows iterating over rows easily.
   *
   * @return {Promise<Integer>}
   */
  prev() {
    return this._seek(-1).then(() => this.row);
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Moves cursor before first row. (Required cache enabled)
   */
  reset() {
    if (!this._cache)
      throw new Error('reset() method needs cache to be enabled');
    this._cache.reset();
    this._rowNum = 0;
  }

  /**
   * Moves cursor by given step. If caching is enabled,
   * cursor can move both forward and backward. Otherwise it throws error.
   *
   * @param {Integer} step
   * @return {Promise<Integer>}
   */
  seek(step) {
    return this._seek(step);
  }

  /**
   * Creates and returns a readable stream.
   *
   * @param {Object} [options]
   * @param {Boolean} [options.objectMode]
   * @param {Integer} [options.outFormat]
   * @param {Integer} [options.limit]
   * @param {Function} [options.stringify]
   * @return {CursorStream}
   */
  toStream(options) {
    return new CursorStream(this, options);
  }

  toString() {
    return '[object ' + Object.getPrototypeOf(this).constructor.name + ']';
  }

  inspect() {
    return this.toString();
  }

  /**
   * @param {Integer} step
   * @param {Boolean} [silent]
   * @return {Promise<Integer>}
   */
  _seek(step, silent) {
    step = parseInt(step, 10);
    if (!step)
      return Promise.resolve(this.rowNum);

    if (step < 0 && !this._cache)
      return Promise.reject(new Error('To move cursor back, it needs cache to be enabled'));

    return this._taskQueue.enqueue((done) => {

      /* If moving backward */
      if (step < 0) {
        /* Seek cache */
        while (step < 0 && this._cache.cursor) {
          this._row = this._cache.prev();
          this._rowNum--;
          step++;
        }
        return done();
      }

      /* If moving forward */
      const moveForward = () => {
        /* Seek cache */
        if (this._cache) {
          while (step > 0 && (this._row = this._cache.next())) {
            this._rowNum++;
            step--;
          }
        }
        /* Fetch from prefetch cache */
        while (step > 0 && (this._row = this._fetchCache.shift())) {
          this._rowNum++;
          step--;
        }
        if (!step || this._fetchedAll)
          return done();
        /* Fetch records from db */
        this._fetchRows().then(() => {
          if (this._fetchedAll) {
            this._row = null;
            this._rowNum++;
            if (this._cache)
              this._cache.next();
            return done();
          }
          setImmediate(() => moveForward());
        }).catch(e => done(e));
      };

      moveForward();
    }).then(() => {
      if (!silent)
        this.emitSafe('move', this._rowNum, this.row);
      return this._rowNum;
    });
  }

  /**
   *
   * @return {Promise}
   * @private
   */
  _fetchRows() {
    if (this.isClosed)
      return Promise.reject(new Error('Cursor closed'));
    return this._cursor.fetch(this._prefetchRows).then(rows => {
      if (rows && rows.length) {
        debug('Fetched %d rows from database', rows.length);
        // Normalize rows
        normalizeRows(rows, {
          objectRows: this._prepared.options.objectRows,
          naming: this._prepared.options.naming,
          ignoreNulls: this._prepared.options.ignoreNulls
        });
        this._prepared.callFetchHooks(rows);
        for (const [idx, row] of rows.entries()) {
          this.emitSafe('fetch', row, (this._rowNum + idx + 1));
        }
        /* Add rows to cache */
        if (this._cache)
          this._cache.push(...rows);
        else
          this._fetchCache.push(...rows);

        this._fetchedRows += rows.length;
        return;
      }
      this._fetchedAll = true;
      this.emitSafe('eof');
      return this.close();
    });
  }

  /**
   *
   */
  emitSafe(...args) {
    try {
      this.emit(...args);
    } catch (ignored) {
      //
    }
  }

}

/**
 * Expose `Cursor`.
 */

module.exports = Cursor;

