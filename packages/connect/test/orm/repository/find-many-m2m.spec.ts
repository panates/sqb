import { SqbClient } from '@sqb/connect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('Repository.findMany() (ManyToMany)', () => {
  let client: SqbClient;

  beforeAll(async () => {
    client = await initClient();
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should return associated instances', async () => {
    const repo = client.getRepository(Customer);
    const rows = await repo.findMany({
      filter: { id: 1 },
      projection: ['id', 'givenName', 'tags'],
    });
    expect(rows.length).toStrictEqual(1);
    expect(rows[0].id).toStrictEqual(1);
    for (const row of rows) {
      expect(Array.isArray(row.tags)).toBeTruthy();
      expect(row.tags!.length).toStrictEqual(2);
      for (const tag of row.tags!) {
        expect(tag.id === 1 || tag.id === 5).toBeTruthy();
      }
    }
  });

  it('should specify returning elements', async () => {
    const repo = client.getRepository(Customer);
    const rows = await repo.findMany({
      filter: { id: 1 },
      projection: ['id', 'tags.color'],
    });
    expect(rows).toBeDefined();
    expect(rows.length).toStrictEqual(1);
    for (const customer of rows) {
      expect(Array.isArray(customer.tags)).toBeTruthy();
      expect(customer.tags!.length).toBeGreaterThan(0);
      for (const tag of customer.tags!) {
        expect(Object.keys(tag)).toStrictEqual(['color']);
      }
    }
  });

  it('should filter by m2m relation', async () => {
    const repo = client.getRepository(Customer);
    const rows = await repo.findMany({
      projection: '+tags',
      filter: { 'tags.color': 'yellow' },
    });
    expect(rows).toBeDefined();
    expect(rows.length).toStrictEqual(1);
    for (const customer of rows) {
      expect(Array.isArray(customer.tags)).toBeTruthy();
      expect(customer.tags!.length).toBeGreaterThan(0);
      expect(customer.tags!.find(tag => tag.color === 'yellow')).toBeDefined();
    }
  });
});
