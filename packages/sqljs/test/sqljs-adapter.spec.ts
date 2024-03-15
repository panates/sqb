import { getInsertSQLsForTestData, initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { SqljsAdapter } from '../src/sqljs-adapter.js';

describe('SqljsAdapter', function () {
  const adapter = new SqljsAdapter();

  beforeAll(async () => {
    const connection = await adapter.connect({database: ':memory:'})
    try {
      await createTestSchema((connection as any).intlcon);
    } finally {
      await connection.close();
    }
  }, 30000);

  initAdapterTests(adapter, {database: ':memory:'});
});

async function createTestSchema(connection) {
  connection.exec(
      (await import('./_support/db_schema.js')).sql
  );
  const dataFiles = getInsertSQLsForTestData({dialect: 'sqlite'});
  for (const table of dataFiles)
    connection.exec(table.scripts.join(';\n'));
}
