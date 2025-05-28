import { In } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';
import { createCustomer } from './update.spec.js';

describe('Repository.updateMany()', () => {
  let client: SqbClient;

  beforeAll(async () => {
    client = await initClient();
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should update multiple rows', async () => {
    const oldCity = 'C' + Math.trunc(Math.random() * 10000);
    const ids: number[] = [];
    for (let i = 0; i < 10; i++) {
      const customer = await createCustomer(client, { city: oldCity });
      ids.push(customer!.id!);
    }
    const repo = client.getRepository(Customer);
    const newCity = 'C' + Math.trunc(Math.random() * 10000);
    const count = await repo.updateMany(
      { city: newCity },
      { filter: In('id', ids) },
    );
    expect(count).toStrictEqual(ids.length);
    const rows = await repo.findMany({ filter: In('id', ids) });
    for (const row of rows) {
      expect(row.city).toStrictEqual(newCity);
    }
  });
});
