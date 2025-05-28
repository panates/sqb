import { SqbClient } from '@sqb/connect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('Repository.findOne()', () => {
  let client: SqbClient;

  beforeAll(async () => {
    client = await initClient();
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should return single instance', async () => {
    const repo = client.getRepository<Customer>(Customer);
    const row = await repo.findOne({ sort: ['id'] });
    expect(row).toBeDefined();
    expect(row!.id).toStrictEqual(1);
  });

  it('should return single instance from given offset', async () => {
    const repo = client.getRepository<Customer>(Customer);
    const row = await repo.findOne({
      sort: ['id'],
      offset: 10,
    });
    expect(row).toBeDefined();
    expect(row!.id).toStrictEqual(11);
  });
});
