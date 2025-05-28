import { In } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';
import { createCustomer } from './update.spec.js';

let client: SqbClient;

describe('Repository.updateOnly()', () => {
  beforeAll(async () => {
    client = await initClient();
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should return "true" if update success', async () => {
    const repo = client.getRepository(Customer);
    const old = await createCustomer(client);
    const newGivenName = 'G' + Math.trunc(Math.random() * 10000);
    let success = await repo.updateOnly(old.id, {
      givenName: newGivenName,
    });
    expect(success).toStrictEqual(true);

    success = await repo.updateOnly(0, {
      givenName: newGivenName,
    });
    expect(success).toStrictEqual(false);

    const c2 = await repo.findById(old.id);
    expect(c2).toBeDefined();
    expect(c2!.id).toStrictEqual(old.id);
    expect(c2!.givenName).toStrictEqual(newGivenName);
  });

  it('should not fetch after update for fast execution', async () =>
    client.acquire(async connection => {
      const repo = connection.getRepository(Customer);
      const old = await createCustomer(client);
      let sql = '';
      connection.on('execute', req => {
        sql = req.sql;
      });
      await repo.updateOnly(old.id, {
        givenName: 'Any name',
      });
      expect(sql.includes('select')).toStrictEqual(false);
    }));

  it('should map embedded elements into fields', async () => {
    const repo = client.getRepository(Customer);
    const old = await createCustomer(client);
    const newName = { given: 'G' + Math.trunc(Math.random() * 10000) };
    const c1 = await repo.update(old.id, {
      name: newName,
    });
    expect(c1).toBeDefined();
    expect(c1 instanceof Customer).toBeTruthy();
    expect(c1!.id).toStrictEqual(old.id);
    expect(c1!.name!.given).toStrictEqual(newName.given);
    expect(c1!.name!.given).not.toStrictEqual(old!.name!.given);

    const c2 = await repo.findById(old.id);
    expect(c2).toBeDefined();
    expect(c2 instanceof Customer).toBeTruthy();
    expect(c2!.id).toStrictEqual(old.id);
    expect(c2!.name!.given).toStrictEqual(newName.given);
  });

  it('should map embedded elements with prefix into fields', async () => {
    const repo = client.getRepository(Customer);
    const old = await createCustomer(client, {
      address: { city: Math.trunc(Math.random() * 10000) },
    });
    const newAddress = { city: 'G' + Math.trunc(Math.random() * 10000) };
    const c1 = await repo.update(old.id, {
      address: newAddress,
    });
    expect(c1).toBeDefined();
    expect(c1 instanceof Customer).toStrictEqual(true);
    expect(c1!.id).toStrictEqual(old.id);
    expect(c1!.address!.city).toStrictEqual(newAddress.city);
    expect(c1!.address!.city).not.toStrictEqual(old.address!.city);

    const c2 = await repo.findById(old.id);
    expect(c2).toBeDefined();
    expect(c2 instanceof Customer).toBeTruthy();
    expect(c2!.id).toStrictEqual(old.id);
    expect(c2!.address!.city).toStrictEqual(newAddress.city);
  });
});

describe('updateAll()', () => {
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
