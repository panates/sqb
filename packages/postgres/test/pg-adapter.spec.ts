import { initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { PgAdapter } from '../src/pg-adapter.js';
import { createTestSchema } from './_support/create-db.js';

describe('postgres:PgAdapter', () => {
  const adapter = new PgAdapter();

  if (process.env.SKIP_CREATE_DB !== 'true') {
    before(async () => {
      await createTestSchema('test_sqb_postgres');
    }).timeout(30000);
  }

  const env = process.env;
  initAdapterTests(adapter, {
    host: env.PGHOST,
    port: parseInt(env.PGPORT || '0', 10) || undefined,
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    schema: 'test_sqb_postgres',
  });
});
