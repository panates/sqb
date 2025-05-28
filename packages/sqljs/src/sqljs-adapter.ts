import '@sqb/sqlite-dialect';
import { Adapter, ClientConfiguration } from '@sqb/connect';
import fs from 'fs';
import path from 'path';
import promisify from 'putil-promisify';
import initSqlJs, { Database } from 'sql.js';
import { SqljsConnection } from './sqljs-connection.js';

type CachedDatabase = Database & { _refCount: number };

const dbCache = new Map<string, CachedDatabase>();

export class SqljsAdapter implements Adapter {
  driver = 'sqljs';
  dialect = 'sqlite';
  features = {
    cursor: true,
    // fetchAsString: [DataType.DATE, DataType.TIMESTAMP, DataType.TIMESTAMPTZ]
  };

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

export async function closeMemoryDatabase(name?: string): Promise<void> {
  const memoryDbName = name || ':memory:';
  const memDb = dbCache.get(memoryDbName);
  if (memDb) {
    dbCache.delete(memoryDbName);
    memDb.close();
  }
}
