import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Country } from '../../_support/country.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('connect:Repository.existsOne()', () => {
  let client: SqbClient;

  before(async () => {
    client = await initClient();
  });

  after(async () => {
    await client.close(0);
  });

  it('should return true if any record exists', async () => {
    const repo = client.getRepository<Country>(Country);
    const c = await repo.existsOne();
    expect(c).toStrictEqual(true);
  });

  it('should return true if any record exists with given filter', async () => {
    const repo = client.getRepository<Country>(Country);
    let c = await repo.existsOne({ filter: { continentCode: 'AM' } });
    expect(c).toStrictEqual(true);
    c = await repo.existsOne({ filter: { continentCode: 'None' } });
    expect(c).toStrictEqual(false);
  });

  it('should filter by one-2-one relation element', async () => {
    const repo = client.getRepository<Country>(Country);
    const c = await repo.existsOne({ filter: { 'continent.code': 'AM' } });
    expect(c).toStrictEqual(true);
  });

  it('should filter by one-2-many relation element', async () => {
    const repo = client.getRepository<Country>(Country);
    const c2 = await repo.existsOne({
      filter: { 'customers.countryCode': 'DE' },
    });
    expect(c2).toStrictEqual(true);
  });
});
