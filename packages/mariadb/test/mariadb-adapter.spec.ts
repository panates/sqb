import { initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { MariadbAdapter } from '../src/mariadb-adapter.js';
import { createTestSchema } from './_support/create-db.js';

describe('mariadb:MariadbAdapter', () => {
  const adapter = new MariadbAdapter();
  const database = process.env.MARIADB_DATABASE || 'sqb_test';

  if (process.env.SKIP_CREATE_DB !== 'true') {
    before(async () => {
      await createTestSchema(database);
    }).timeout(30000);
  }

  const env = process.env;
  initAdapterTests(adapter, {
    host: env.MARIADB_HOST,
    port: env.MARIADB_PORT ? parseInt(env.MARIADB_PORT, 10) : undefined,
    database,
    user: env.MARIADB_USER || 'root',
    password: env.MARIADB_PASSWORD,
  });
});
