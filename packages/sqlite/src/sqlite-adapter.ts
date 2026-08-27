import '@sqb/sqlite-dialect';
import type { Adapter, ClientConfiguration } from '@sqb/connect';
import path from 'path';
import { openDatabase } from './drivers/index.js';
import type { NativeDatabase } from './drivers/types.js';
import { SqliteConnection } from './sqlite-connection.js';

type CachedDatabase = NativeDatabase & { _refCount: number };

const dbCache = new Map<string, CachedDatabase>();

export class SqliteAdapter implements Adapter {
  driver = 'sqlite';
  dialect = 'sqlite';
  features: Adapter.Features = {
    cursor: true,
  };

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

export async function closeMemoryDatabase(name?: string): Promise<void> {
  const memoryDbName = name || ':memory:';
  const memDb = dbCache.get(memoryDbName);
  if (memDb) {
    dbCache.delete(memoryDbName);
    memDb.close();
  }
}
