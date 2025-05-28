import { SqbClient } from '@sqb/connect';
import { Country } from '../../_support/country.entity.js';
import { CustomerTag } from '../../_support/customer-tag.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('Repository.findById()', () => {
  let client: SqbClient;

  beforeAll(async () => {
    client = await initClient();
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should return single instance by key value', async () => {
    const repo = client.getRepository<Country>(Country);
    const row = await repo.findById('TR');
    expect(row).toBeDefined();
    expect(row!.code).toStrictEqual('TR');
    expect(row!.name).toStrictEqual('Turkey');
  });

  it('should return single instance by object instance', async () => {
    const repo = client.getRepository<Country>(Country);
    const row = await repo.findById({ code: 'TR' });
    expect(row).toBeDefined();
    expect(row!.code).toStrictEqual('TR');
    expect(row!.name).toStrictEqual('Turkey');
  });

  it('should return instance from multi-key entities', async () => {
    const repo = client.getRepository<CustomerTag>(CustomerTag);
    const row = await repo.findById({ customerId: 1, tagId: 1 });
    expect(row).toBeDefined();
    expect(row!.customerId).toStrictEqual(1);
    expect(row!.tagId).toStrictEqual(1);
  });
});
