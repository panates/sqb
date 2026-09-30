import { initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { OraAdapter } from '../src/ora-adapter.js';
import { createTestSchema, dbConfig } from './_support/create-db.js';

describe('oracle:OraAdapter', () => {
  const adapter = new OraAdapter();

  if (process.env.SKIP_CREATE_DB !== 'true') {
    before(async () => {
      await createTestSchema();
    }).timeout(30000);
  }
  initAdapterTests(adapter, dbConfig);
});
