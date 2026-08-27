import { initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { MssqlAdapter } from '../src/mssql-adapter.js';
import { createTestSchema } from './_support/create-db.js';

describe('mssql:MssqlAdapter', () => {
  const adapter = new MssqlAdapter();
  const database = process.env.MSSQL_DATABASE || 'sqb_test';

  if (process.env.SKIP_CREATE_DB !== 'true') {
    before(async () => {
      await createTestSchema(database);
    }).timeout(60000);
  }

  const env = process.env;
  initAdapterTests(adapter, {
    host: env.MSSQL_HOST,
    port: env.MSSQL_PORT ? parseInt(env.MSSQL_PORT, 10) : undefined,
    database,
    user: env.MSSQL_USER || 'sa',
    password: env.MSSQL_PASSWORD || 'Sqb_Test_2024!',
  });
});
