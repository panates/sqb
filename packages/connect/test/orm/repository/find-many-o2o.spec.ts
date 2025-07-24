import { Eq, op } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';

function toJSON(obj: any): any {
  return obj ? JSON.parse(JSON.stringify(obj)) : undefined;
}

describe('connect:Repository.findMany() (OneToOne)', () => {
  let client: SqbClient;

  before(async () => {
    client = await initClient();
  });

  after(async () => {
    await client.close(0);
  });

  describe('connect:linkToOne', () => {
    it('return associated row as object property', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: 'id,countryCode,country',
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(rows[0].countryCode).toStrictEqual('US');
      expect(toJSON(rows[0].country)).toStrictEqual({
        code: 'US',
        name: 'United States',
        hasMarket: true,
        phoneCode: '+1',
        continentCode: 'AM',
      });
    });

    it('dont return associated if not explicitly requested', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(rows[0].country).toBeUndefined();
    });

    it('query sub associations', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'country.continent'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(toJSON(rows[0].country)).toStrictEqual({
        continent: {
          code: 'AM',
          name: 'America',
        },
      });
    });

    it('query sub associations (include)', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', '+country.continent'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(toJSON(rows[0])).toStrictEqual({
        id: 1,
        country: {
          continent: {
            code: 'AM',
            name: 'America',
          },
        },
      });
    });

    it('choice which elements will be returned by server', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'country.code', 'country.continent.code'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(toJSON(rows[0].country)).toStrictEqual({
        code: 'US',
        continent: {
          code: 'AM',
        },
      });
    });

    it('filter results by associated element', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'countryCode'],
        filter: Eq('country.continent.code', 'AM'),
      });
      for (const row of rows) {
        expect(
          row.countryCode === 'CA' || row.countryCode === 'US',
        ).toBeTruthy();
      }
    });

    it('use "exists" when filtering by associated element', async () => {
      const repo = client.getRepository(Customer);
      let request: any = {};
      client.once('execute', req => (request = req));
      await repo.findMany({
        projection: ['id'],
        filter: [
          op.or(
            op.eq('country.continent.name', 'America'),
            op.eq('country.continent.name', 'Europe'),
          ),
        ],
        prettyPrint: true,
      });
      expect(request.sql).toEqual(`select T.ID as T_ID from customers T
where (exists (select 1 from countries K
    inner join continents J1 on J1.code = K.continent_code
    where K.code = T.country_code and (J1.name = $1)) or
    exists (select 1 from countries K
    inner join continents J1 on J1.code = K.continent_code
    where K.code = T.country_code and (J1.name = $2)))`);
      expect(request.params).toStrictEqual(['America', 'Europe']);
    });

    it('order by associated element', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'countryCode', 'country.code', 'country.phoneCode'],
        sort: ['country.code'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      const left = rows.map(x => x.country!.code);
      const sorted = [...left];
      sorted.sort();
      expect(left).toStrictEqual(sorted);
    });
  });

  describe('connect:linkFromOne', () => {
    it('return associated row as object property', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'details'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].details).toBeDefined();
      expect(rows[0].details!.customerId).toStrictEqual(1);
    });

    it('choice which elements will be returned by server', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'details.notes'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(Object.keys(rows[0].details!)).toStrictEqual(['notes']);
    });

    it('filter results by associated element', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'details'],
        filter: Eq('details.customerId', 1),
      });
      expect(rows.length).toStrictEqual(1);
      expect(rows[0].id).toStrictEqual(1);
      expect(rows[0].details!.customerId).toStrictEqual(1);
    });

    it('order by associated element', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'details.notes'],
        sort: ['details.notes'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      const left = rows.map(x => (x.details ? x.details.notes : undefined));
      const sorted = [...left];
      sorted.sort();
      expect(left).toStrictEqual(sorted);
    });
  });

  describe('connect:Association chain', () => {
    it('return row of last association in the chain as object property', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'countryCode', 'country'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(rows[0].countryCode).toStrictEqual('US');
      expect(toJSON(rows[0].country)).toStrictEqual({
        code: 'US',
        name: 'United States',
        hasMarket: true,
        phoneCode: '+1',
        continentCode: 'AM',
      });
    });

    it('query sub associations', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'country.continent'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(toJSON(rows[0].country)).toStrictEqual({
        continent: {
          code: 'AM',
          name: 'America',
        },
      });
    });

    it('choice which elements will be returned by server', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'country.code', 'country.continent.code'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(toJSON(rows[0].country)).toStrictEqual({
        code: 'US',
        continent: {
          code: 'AM',
        },
      });
    });

    it('filter by associated element', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'countryCode'],
        filter: Eq('country.continent.code', 'AM'),
      });
      for (const row of rows) {
        expect(
          row.countryCode === 'CA' || row.countryCode === 'US',
        ).toBeTruthy();
      }
    });

    it('use "exists" when filtering by associated element', async () => {
      const repo = client.getRepository(Customer);
      let request: any = {};
      client.once('execute', req => (request = req));
      await repo.findMany({
        projection: ['id'],
        filter: [{ 'country.continent.code': 'AM' }],
      });
      expect(request.sql.includes('exists')).toStrictEqual(true);
      expect(request.params).toStrictEqual(['AM']);
    });

    it('order by associated element', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'countryCode', 'country.code', 'country.phoneCode'],
        sort: ['country.code'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      const left = rows.map(x => x.country!.code);
      const sorted = [...left];
      sorted.sort();
      expect(left).toStrictEqual(sorted);
    });

    it('query indirect associations', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        filter: [Eq('id', 1)],
        projection: ['id', 'continent'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].id).toStrictEqual(1);
      expect(toJSON(rows[0].continent)).toStrictEqual({
        code: 'AM',
        name: 'America',
      });
    });

    it('order by indirect associated elements', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'countryCode', 'country.continentCode'],
        sort: ['continent.code'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      const left = rows.map(x => x.country!.code);
      const sorted = [...left];
      sorted.sort();
      expect(left).toStrictEqual(sorted);
    });

    it('associations with target conditions', async () => {
      const repo = client.getRepository(Customer);
      const rows = await repo.findMany({
        projection: ['id', 'vvipDetails'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      const a = rows.filter(x => x.vvipDetails);
      expect(a.length).toBeGreaterThan(0);
      for (const customer of rows) {
        if (customer.vvipDetails)
          expect(customer.vvipDetails.rank).toBeGreaterThanOrEqual(5);
      }
    });
  });
});
