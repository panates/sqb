import '@sqb/postgres';
import { type ClientConfiguration, SqbClient } from '@sqb/connect';
import { createTestSchema } from '../../../postgres/test/_support/create-db.js';

/**
 * A test that inserts, updates or deletes rows passes `{ writes: true }` and
 * runs against a schema of its own, so the rows it leaves behind never reach
 * the tests that read the seed data - they would otherwise see whatever the
 * test files run before them had added.
 */
export async function initClient(
  config?: ClientConfiguration,
  options?: { writes?: boolean },
): Promise<SqbClient> {
  const schema = options?.writes
    ? 'test_sqb_connect_writes'
    : 'test_sqb_connect';
  await createTestSchema(schema);
  return new SqbClient({
    dialect: 'postgres',
    schema,
    ...config,
  });
}
