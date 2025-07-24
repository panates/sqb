import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('connect:Repository.deleteMany()', () => {
  let client: SqbClient;

  before(async () => {
    client = await initClient();
  });

  after(async () => {
    await client.close(0);
  });

  it('should delete multiple records by filter', async () => {
    const values = {
      givenName: 'G' + Math.trunc(Math.random() * 10000),
      familyName: 'F' + Math.trunc(Math.random() * 10000),
      countryCode: 'US',
      city: 'city_' + Math.trunc(Math.random() * 10000),
    };
    const repo = client.getRepository<Customer>(Customer);
    await repo.createOnly(values);
    await repo.createOnly(values);
    await repo.createOnly(values);
    let rows = await repo.findMany({ filter: { city: values.city } });
    expect(rows.length).toStrictEqual(3);
    await repo.deleteMany({ filter: { city: values.city } });
    rows = await repo.findMany({ filter: { city: values.city } });
    expect(rows.length).toStrictEqual(0);
  });
});
