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
    // Defaults to 3307, matching packages/mariadb/docker-compose.yml - the
    // driver's own default (3306) would silently hit the mysql test
    // container instead, which doesn't understand RETURNING.
    port: env.MARIADB_PORT ? parseInt(env.MARIADB_PORT, 10) : 3307,
    database,
    user: env.MARIADB_USER || 'root',
    password: env.MARIADB_PASSWORD,
  });
});
