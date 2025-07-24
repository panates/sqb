import { initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { OraAdapter } from '../src/ora-adapter.js';
import { createTestSchema, dbConfig } from './_support/create-db.js';

describe.skip('oracle:OraAdapter', () => {
  const adapter = new OraAdapter();

  if (process.env.SKIP_CREATE_DB !== 'true') {
    before(async () => {
      try {
        // @ts-ignore
        await import('./_support/env-dev.js');
      } catch {
        //
      }
      await createTestSchema();
    }).timeout(30000);
  }
  initAdapterTests(adapter, dbConfig);
});
