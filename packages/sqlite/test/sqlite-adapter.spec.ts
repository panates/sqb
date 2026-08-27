import {
  getInsertSQLsForTestData,
  initAdapterTests,
} from '../../connect/test/_shared/adapter-tests.js';
import { SqliteAdapter } from '../src/sqlite-adapter.js';

describe('sqlite:SqliteAdapter', () => {
  const adapter = new SqliteAdapter();

  before(async () => {
    const connection = await adapter.connect({ database: ':memory:' });
    try {
      await createTestSchema((connection as any).intlcon);
    } finally {
      await connection.close();
    }
  }).timeout(30000);

  initAdapterTests(adapter, { database: ':memory:' });
});

async function createTestSchema(connection: { exec(sql: string): void }) {
  connection.exec((await import('./_support/db_schema.js')).sql);
  const dataFiles = getInsertSQLsForTestData({ dialect: 'sqlite' });
  for (const table of dataFiles) connection.exec(table.scripts.join(';\n'));
}
