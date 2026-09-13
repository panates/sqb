import '@sqb/sqlite-dialect';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import fs from 'fs';
import path from 'path';
import promisify from 'putil-promisify';
import initSqlJs, { type Database } from 'sql.js';
import { SqljsConnection } from './sqljs-connection.js';

/** A `sql.js` {@link Database} plus a count of the SQB connections currently sharing it, used by {@link dbCache} to close a shared database once its last connection releases it. */
type CachedDatabase = Database & { _refCount: number };

/**
 * Open `sql.js` databases keyed by resolved file path, shared across
 * concurrent SQB connections opened against the same file - `sql.js` loads
 * an entire database into memory and has no connection pooling of its
 * own, so a second `connect()` call for a file already open reuses the
 * same in-memory instance (refcounted) rather than re-reading and
 * re-parsing the file. An in-memory database (`:memory:` or
 * `:memory:name`) is cached too (so multiple connections can see the same
 * in-memory data) but is never refcount-closed by
 * {@link SqljsAdapter.connect}'s closer - only {@link closeMemoryDatabase}
 * closes one, since closing it on the last connection's `close()` would
 * silently discard that in-memory data for any code still expecting to
 * reopen it by name.
 */
const dbCache = new Map<string, CachedDatabase>();

/**
 * `@sqb/connect` {@link Adapter} for SQLite, wrapping the pure-WASM
 * `sql.js` npm package. Registered automatically as a side effect of
 * importing this package - see `index.ts`.
 */
export class SqljsAdapter implements Adapter {
  driver = 'sqljs';
  dialect = 'sqlite';
  features: Adapter.Features = {
    cursor: true,
    // fetchAsString: [DataType.DATE, DataType.TIMESTAMP, DataType.TIMESTAMPTZ]
  };

  /**
   * Opens (or reuses, via {@link dbCache}) the `sql.js` database at
   * `config.database` - a `:memory:`/`:memory:name` in-memory database
   * (created empty), or a file path (resolved relative to the current
   * working directory) read fully into memory via `SQL.Database(buffer)`.
   *
   * @throws {Error} if `config.database` isn't given
   */
  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    if (!config.database)
      throw new Error(
        'You must provide sqlite database file for sql.js driver',
      );

    let dbName = '';
    let isMemory = false;

    const m = config.database.match(/^(:memory:)(\w+)?$/);
    if (m) {
      isMemory = true;
      dbName = config.database;
    } else {
      dbName = path.resolve(config.database);
    }

    let intlDb = dbCache.get(dbName);
    if (intlDb) {
      intlDb._refCount++;
    } else {
      const SQL = await initSqlJs();
      if (isMemory) {
        intlDb = new SQL.Database() as CachedDatabase;
        intlDb._refCount = 0;
      } else {
        const buf = await promisify.fromCallback(cb => fs.readFile(dbName, cb));
        intlDb = new SQL.Database(buf) as CachedDatabase;
        intlDb._refCount = 1;
      }
      dbCache.set(dbName, intlDb);
    }

    const _intlDb = intlDb;
    return new SqljsConnection(_intlDb, () => {
      if (isMemory) return;
      if (--_intlDb._refCount <= 0) {
        _intlDb.close();
        dbCache.delete(dbName);
      }
    });
  }
}

/**
 * Closes and evicts an in-memory database from {@link dbCache} by name
 * (defaulting to the unnamed `:memory:` database). In-memory databases are
 * never closed automatically by a connection's `close()` (unlike file
 * databases, which are refcounted), so this is the only way to release one
 * once no longer needed - primarily useful for test teardown.
 */
export async function closeMemoryDatabase(name?: string): Promise<void> {
  const memoryDbName = name || ':memory:';
  const memDb = dbCache.get(memoryDbName);
  if (memDb) {
    dbCache.delete(memoryDbName);
    memDb.close();
  }
}
