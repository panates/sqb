import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('connect:Repository.delete()', () => {
  let client: SqbClient;

  before(async () => {
    client = await initClient();
  });

  after(async () => {
    await client.close(0);
  });

  it('should delete single record', async () => {
    const values = {
      givenName: 'G' + Math.trunc(Math.random() * 10000),
      familyName: 'F' + Math.trunc(Math.random() * 10000),
      countryCode: 'TR',
    };
    const repo = client.getRepository(Customer);
    const customer = await repo.create(values);
    expect(await repo.findById(customer.id)).toBeDefined();
    await repo.delete(customer.id);
    expect(await repo.findById(customer.id)).not.toBeDefined();
  });

  it('should execute in transaction', async () => {
    let c = 0;
    return client.acquire(async connection => {
      const values = {
        givenName: 'Abc',
        familyName: 'Def',
        countryCode: 'DE',
      };
      const repo = connection.getRepository<Customer>(Customer);
      const customer = await repo.create(values);
      c = await repo.count();
      await connection.startTransaction();
      await repo.delete(customer.id);
      let c2 = await repo.count();
      expect(c2).toStrictEqual(c - 1);
      await connection.rollback();
      c2 = await repo.count();
      expect(c2).toStrictEqual(c);
    });
  });
});
