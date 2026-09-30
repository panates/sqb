import '@sqb/sqlite-dialect';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import path from 'path';
import { openDatabase } from './drivers/index.js';
import type { NativeDatabase } from './drivers/types.js';
import { SqliteConnection } from './sqlite-connection.js';

/** A {@link NativeDatabase} plus a count of the SQB connections currently sharing it, used by {@link dbCache} to close a shared database once its last connection releases it. */
type CachedDatabase = NativeDatabase & { _refCount: number };

/**
 * Open native databases keyed by resolved file path, shared across
 * concurrent SQB connections opened against the same file - SQLite has no
 * connection pooling of its own, so a second `connect()` call for a file
 * already open reuses the same native handle (refcounted) rather than
 * opening it twice. An in-memory database (`:memory:` or `:memory:name`)
 * is cached too (so multiple connections can see the same in-memory data)
 * but is never refcount-closed by {@link SqliteAdapter.connect}'s closer -
 * only {@link closeMemoryDatabase} closes one, since closing it on the
 * last connection's `close()` would silently discard that in-memory data
 * for any code still expecting to reopen it by name.
 */
const dbCache = new Map<string, CachedDatabase>();

/**
 * `@sqb/connect` {@link Adapter} for SQLite, wrapping either Node's
 * built-in `node:sqlite` or, when running under Bun, `bun:sqlite` (see
 * `./drivers/index.ts`). Registered automatically as a side effect of
 * importing this package - see `index.ts`.
 */
export class SqliteAdapter implements Adapter {
  driver = 'sqlite';
  dialect = 'sqlite';
  features: Adapter.Features = {
    cursor: true,
  };

  /**
   * Opens (or reuses, via {@link dbCache}) the native SQLite database at
   * `config.database` - a `:memory:`/`:memory:name` in-memory database, or
   * a file path resolved relative to the current working directory.
   *
   * @throws {Error} if `config.database` isn't given
   */
  async connect(config: ClientConfiguration): Promise<Adapter.Connection> {
    if (!config.database)
      throw new Error('You must provide a sqlite database file');

    let dbName = '';
    const isMemory = /^:memory:(\w+)?$/.test(config.database);
    dbName = isMemory ? config.database : path.resolve(config.database);

    let intlDb = dbCache.get(dbName);
    if (intlDb) {
      intlDb._refCount++;
    } else {
      intlDb = (await openDatabase(dbName)) as CachedDatabase;
      intlDb._refCount = isMemory ? 0 : 1;
      dbCache.set(dbName, intlDb);
    }

    const _intlDb = intlDb;
    return new SqliteConnection(_intlDb, () => {
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
