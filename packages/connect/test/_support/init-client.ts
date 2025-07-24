import '@sqb/postgres';
import { ClientConfiguration, SqbClient } from '@sqb/connect';
import { createTestSchema } from '../../../postgres/test/_support/create-db.js';

export async function initClient(
  config?: ClientConfiguration,
): Promise<SqbClient> {
  await createTestSchema('test_sqb_connect');
  return new SqbClient({
    dialect: 'postgres',
    schema: 'test_sqb_connect',
    ...config,
  });
}
