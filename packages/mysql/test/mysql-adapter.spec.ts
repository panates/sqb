import { initAdapterTests } from '../../connect/test/_shared/adapter-tests.js';
import { MysqlAdapter } from '../src/mysql-adapter.js';
import { createTestSchema } from './_support/create-db.js';

describe('mysql:MysqlAdapter', () => {
  const adapter = new MysqlAdapter();
  const database = process.env.MYSQL_DATABASE || 'sqb_test';

  if (process.env.SKIP_CREATE_DB !== 'true') {
    before(async () => {
      await createTestSchema(database);
    }).timeout(30000);
  }

  const env = process.env;
  initAdapterTests(adapter, {
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT ? parseInt(env.MYSQL_PORT, 10) : undefined,
    database,
    user: env.MYSQL_USER || 'root',
    password: env.MYSQL_PASSWORD,
  });
});
