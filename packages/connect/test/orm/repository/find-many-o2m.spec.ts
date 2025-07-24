import { Eq, In } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Continent } from '../../_support/continent.entity.js';
import { Country } from '../../_support/country.entity.js';
import { Customer } from '../../_support/customer.entity.js';
import { initClient } from '../../_support/init-client.js';

describe('connect:Repository.findMany() (OneToMany)', () => {
  let client: SqbClient;

  before(async () => {
    client = await initClient();
  });

  after(async () => {
    await client.close(0);
  });

  describe('connect:linkToMany', () => {
    it('return associated rows as array property', async () => {
      const repo = client.getRepository(Continent);
      const rows = await repo.findMany({
        projection: ['code', 'countries'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      for (const continent of rows) {
        expect(Array.isArray(continent.countries)).toBeTruthy();
        expect(continent.countries!.length).toBeGreaterThan(0);
        for (const country of continent.countries!) {
          expect(country.continentCode).toStrictEqual(continent.code);
        }
      }
    });

    it('choice which elements will be returned by server', async () => {
      const repo = client.getRepository(Country);
      const rows = await repo.findMany({
        filter: [In('code', ['DE', 'TR'])],
        projection: ['code', 'customers.givenName', 'customers.countryCode'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toStrictEqual(2);
      for (const country of rows) {
        expect(Array.isArray(country.customers)).toBeTruthy();
        expect(country.customers!.length).toBeGreaterThan(0);
        for (const customer of country.customers!) {
          expect(Object.keys(customer)).toStrictEqual([
            'givenName',
            'countryCode',
          ]);
          expect(customer.countryCode).toStrictEqual(country.code);
        }
      }
    });

    it('sort associated instances', async () => {
      const repo = client.getRepository(Country);
      client.defaults.showSql = true;
      const rows = await repo.findMany({
        projection: ['code', 'customers'],
        sort: ['code', 'customers.givenName'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      const sortedCountries = [...rows];
      sortedCountries.sort((a, b) => {
        if (a.code!.toLowerCase() < b.code!.toLowerCase()) return -1;
        if (a.code!.toLowerCase() > b.code!.toLowerCase()) return 1;
        return 0;
      });

      for (let i = 0; i < rows.length; i++) {
        const country = rows[i];
        expect(country.code).toStrictEqual(sortedCountries[i].code);
        if (!country.customers) continue;
        expect(Array.isArray(country.customers)).toBeTruthy();
        const arr1 = country.customers.map(x => x.givenName!.toLowerCase());
        const arr2 = country.customers.map(x => x.givenName!.toLowerCase());
        arr2.sort();
        expect(arr1).toStrictEqual(arr2);
      }
    });

    it('return sub elements of sub associated element', async () => {
      const repo = client.getRepository(Continent);
      const rows = await repo.findMany({
        filter: { code: 'AM' },
        projection: [
          'code',
          'countries.continentCode',
          'countries.customers',
          'countries.code',
        ],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      for (const continent of rows) {
        expect(continent.code).toStrictEqual('AM');
        expect(Array.isArray(continent.countries)).toBeTruthy();
        for (const country of continent.countries!) {
          expect(country.continentCode).toStrictEqual(continent.code);
          expect(Array.isArray(country.customers)).toBeTruthy();
          for (const customer of country.customers!) {
            expect(customer.countryCode).toStrictEqual(country.code);
          }
        }
      }
    });

    it('include sub elements of sub associated element', async () => {
      const repo = client.getRepository(Continent);
      const rows = await repo.findMany({
        filter: { code: 'AM' },
        projection: ['+countries.+customers'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      for (const continent of rows) {
        expect(continent.code).toStrictEqual('AM');
        expect(Array.isArray(continent.countries)).toBeTruthy();
        for (const country of continent.countries!) {
          expect(country.continentCode).toStrictEqual(continent.code);
          expect(Array.isArray(country.customers)).toBeTruthy();
          for (const customer of country.customers!) {
            expect(customer.countryCode).toStrictEqual(country.code);
          }
        }
      }
    });

    it('limit maximum sub queries', async () => {
      const repo = client.getRepository(Country);
      let r = await repo.findMany({
        projection: ['code', 'customers.id'],
        maxSubQueries: 1,
      });
      expect(r).toBeDefined();
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].code).toBeDefined();
      expect(r[0].customers).toBeDefined();

      r = r = await repo.findMany({
        projection: ['code', 'customers.id'],
        maxSubQueries: 0,
      });
      expect(r).toBeDefined();
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].code).toBeDefined();
      expect(r[0].customers).toBeUndefined();
    });

    it('limit maximum number of eager items', async () => {
      const repo = client.getRepository(Country);
      await expect(
        async () =>
          await repo.findMany({
            projection: ['code', 'customers.id'],
            maxEagerFetch: 5,
          }),
      ).rejects.toThrow('maxEagerFetch');
    });

    it('detect circular queries', async () => {
      const repo1 = client.getRepository(Country);
      await expect(() =>
        repo1.findMany({
          projection: ['customers.country'],
        }),
      ).rejects.toThrow('Circular');

      const repo2 = client.getRepository(Customer);
      await expect(() =>
        repo2.findMany({
          projection: ['country.customers.country'],
        }),
      ).rejects.toThrow('Circular');
    });
  });

  describe('connect:linkFromMany', () => {
    it('return associated rows as array property', async () => {
      const repo = client.getRepository(Country);
      const rows = await repo.findMany({
        filter: [In('code', ['DE', 'TR'])],
        projection: ['code', 'customers'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      for (const country of rows) {
        expect(Array.isArray(country.customers)).toBeTruthy();
        expect(country.customers!.length).toBeGreaterThan(0);
        for (const customer of country.customers!) {
          expect(customer.countryCode).toStrictEqual(country.code);
        }
      }
    });

    it('query indirect associations', async () => {
      const repo = client.getRepository(Continent);
      const rows = await repo.findMany({
        filter: { code: 'AM' },
        projection: [
          'code',
          'countries.continentCode',
          'countries.customers',
          'countries.code',
        ],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      for (const continent of rows) {
        expect(continent.code).toStrictEqual('AM');
        expect(Array.isArray(continent.countries)).toBeTruthy();
        for (const country of continent.countries!) {
          expect(country.continentCode).toStrictEqual(continent.code);
          expect(Array.isArray(country.customers)).toBeTruthy();
          for (const customer of country.customers!) {
            expect(customer.countryCode).toStrictEqual(country.code);
          }
        }
      }
    });

    it('choice which elements will be returned by server', async () => {
      const repo = client.getRepository(Country);
      const rows = await repo.findMany({
        filter: [In('code', ['DE', 'TR'])],
        projection: ['code', 'customers.givenName', 'customers.countryCode'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toStrictEqual(2);
      for (const country of rows) {
        expect(Array.isArray(country.customers)).toBeTruthy();
        expect(country.customers!.length).toBeGreaterThan(0);
        for (const customer of country.customers!) {
          expect(Object.keys(customer)).toStrictEqual([
            'givenName',
            'countryCode',
          ]);
          expect(customer.countryCode).toStrictEqual(country.code);
        }
      }
    });

    it('limit maximum sub queries', async () => {
      const repo = client.getRepository(Country);
      let r = await repo.findMany({
        projection: ['code', 'customers.id'],
        maxSubQueries: 1,
      });
      expect(r).toBeDefined();
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].code).toBeDefined();
      expect(r[0].customers).toBeDefined();

      r = r = await repo.findMany({
        projection: ['code', 'customers.id'],
        maxSubQueries: 0,
      });
      expect(r).toBeDefined();
      expect(r.length).toBeGreaterThan(0);
      expect(r[0].code).toBeDefined();
      expect(r[0].customers).toBeUndefined();
    });

    it('throw if eager rows exceeds limit', async () => {
      const repo = client.getRepository(Country);
      await expect(
        async () =>
          await repo.findMany({
            projection: ['code', 'customers.id'],
            maxEagerFetch: 5,
          }),
      ).rejects.toThrow('maxEagerFetch');
    });

    it('detect circular queries', async () => {
      const repo1 = client.getRepository(Country);
      await expect(() =>
        repo1.findMany({
          filter: { code: 'US' },
          projection: ['code', 'customers.country'],
        }),
      ).rejects.toThrow('Circular');

      const repo2 = client.getRepository(Customer);
      await expect(() =>
        repo2.findMany({
          filter: { code: 'US' },
          projection: ['id', 'country.code', 'country.customers.country'],
        }),
      ).rejects.toThrow('Circular');
    });
  });

  describe('connect:Association chain', () => {
    it('associations with target conditions', async () => {
      const repo = client.getRepository(Country);
      const rows = await repo.findMany({
        filter: [Eq('code', 'US')],
        projection: ['code', 'vipCustomers'],
      });
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      for (const country of rows) {
        expect(Array.isArray(country.vipCustomers)).toBeTruthy();
        expect(country.vipCustomers!.length).toBeGreaterThan(0);
        for (const customer of country.vipCustomers!) {
          expect(customer.vip).toStrictEqual(true);
        }
      }
    });
  });
});
