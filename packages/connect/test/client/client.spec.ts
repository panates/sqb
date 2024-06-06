/* eslint-disable @typescript-eslint/no-non-null-assertion,camelcase */
import { DataType, Insert, Param, Select } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';
import { initClient } from '../_support/init-client.js';

describe('Client', function () {
  let client: SqbClient;
  const dialect = 'postgres';
  const insertedIds: any[] = [];

  beforeAll(async () => {
    client = await initClient();
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should throw if no configuration argument given', function () {
    expect(
      // @ts-ignore
      () => new SqbClient(undefined),
    ).toThrow('Configuration object required');
  });

  it('should throw if adapter for driver is not registered', function () {
    expect(() => new SqbClient({ driver: 'unknown' })).toThrow('No database adapter registered for');
  });

  it('should initialize client with driver name', function () {
    const _client = new SqbClient({ driver: 'postgresql-client' });
    expect(_client.dialect).toStrictEqual(dialect);
    expect(_client.driver).toStrictEqual('postgresql-client');
  });

  it('should initialize client with dialect name', function () {
    const _client = new SqbClient({ dialect });
    expect(_client.dialect).toStrictEqual(dialect);
    expect(_client.driver).toStrictEqual('postgresql-client');
  });

  it('should initialize default options', function () {
    const _client = new SqbClient({ dialect });
    const opts = _client.pool.options;
    expect(opts.acquireMaxRetries).toStrictEqual(0);
    expect(opts.acquireRetryWait).toStrictEqual(2000);
    expect(opts.acquireTimeoutMillis).toStrictEqual(0);
    expect(opts.idleTimeoutMillis).toStrictEqual(30000);
    expect(opts.max).toStrictEqual(10);
    expect(opts.min).toStrictEqual(0);
    expect(opts.minIdle).toStrictEqual(0);
    expect(opts.maxQueue).toStrictEqual(1000);
    expect(opts.validation).toStrictEqual(false);
  });

  it('should make a connection test', async function () {
    await client.test();
  });

  it('should execute a raw select query', async function () {
    const result = await client.execute('select * from customers', {
      objectRows: false,
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(Array.isArray(result.rows![0])).toBeTruthy();
    expect(result.rows![0][0]).toStrictEqual(1);
  });

  it('should execute an sqb query', async function () {
    const result = await client.execute(Select().from('customers'), {
      objectRows: false,
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(Array.isArray(result.rows![0])).toBeTruthy();
    expect(result.rows![0][0]).toStrictEqual(1);
  });

  it('should select() and return array rows', async function () {
    const result = await client.execute(Select().from('customers'), { objectRows: false, fetchRows: 2 });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(Array.isArray(result.rows![0])).toBeTruthy();
    expect(result.rows![0][0]).toStrictEqual(1);
  });

  it('should select() and return object rows', async function () {
    const result = await client.execute(Select().from('customers'), { fetchRows: 2 });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toStrictEqual(2);
    expect(!Array.isArray(result.rows![0])).toBeTruthy();
    expect(result.rows![0].id).toStrictEqual(1);
  });

  it('should limit returning record with fetchRows property', async function () {
    const result = await client.execute(Select().from('customers'), {
      objectRows: false,
      fetchRows: 2,
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toStrictEqual(2);
    expect(Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0][0]).toStrictEqual(1);
  });

  it('execute a query with parameters', async function () {
    const query = Select()
      .from('customers')
      .where({ id: Param('id') });
    const result = await client.execute(query, { params: { id: 1 } });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toStrictEqual(1);
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0].id).toStrictEqual(1);
  });

  it('execute a query with typed parameters', async function () {
    const query = Select()
      .from('customers')
      .where({ id: Param('id', DataType.INTEGER) });
    const result = await client.execute(query, { params: { id: '1' } });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toStrictEqual(1);
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0].id).toStrictEqual(1);
  });

  it('should insert record', async function () {
    const given = 'X' + Math.floor(Math.random() * 10000);
    const c = (await client.execute('select count(*) from customers')).rows[0].count;
    const result = await client.execute(Insert('customers', { given_name: given }));
    expect(result).toBeDefined();
    expect(result.rowsAffected).toStrictEqual(1);
    const c2 = (await client.execute('select count(*) from customers')).rows[0].count;
    expect(c2).toStrictEqual(c + 1);
  });

  it('should insert record with returning', async function () {
    const given = 'X' + Math.floor(Math.random() * 10000);
    const family = 'X' + Math.floor(Math.random() * 10000);
    const query = Insert('customers', {
      given_name: given,
      family_name: family,
      city: null,
    }).returning('id');
    const result = await client.execute(query);
    expect(result).toBeDefined();
    expect(result.rowsAffected).toStrictEqual(1);
    expect(result.rows[0].id).toBeGreaterThan(0);
    insertedIds.push(result.rows[0].id);
  });

  it('should acquire(callback) acquire a new session and execute the callback', async function () {
    await client.acquire(async connection => {
      const result = await connection.execute('select * from customers', {
        objectRows: false,
        params: [],
      });
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows[0])).toBeTruthy();
      expect(result.rows[0][0]).toStrictEqual(1);
    });
  });

  it('should acquire(callback) rollback transaction on error', async function () {
    const c = (await client.execute('select count(*) from customers')).rows[0].count;
    try {
      await client.acquire(async connection => {
        await connection.startTransaction();
        await connection.execute('insert into customers (given_name) values (:given)', {
          params: {
            given: 'John',
          },
        });
        const c2 = (await connection.execute('select count(*) from customers')).rows[0].count;
        expect(c2).toStrictEqual(c);
        throw new Error('any error');
      });
    } catch (ignored) {
      //
    }
    const c3 = (await client.execute('select count(*) from customers')).rows[0].count;
    expect(c3).toStrictEqual(c);
  });

  it('should acquire(callback) rollback transaction if not committed', async function () {
    const c = (await client.execute('select count(*) from customers')).rows[0].count;
    try {
      await client.acquire(async connection => {
        await connection.startTransaction();
        await connection.execute('insert into customers (given_name) values (:given)', {
          params: {
            given: 'John',
          },
        });
        const c2 = (await connection.execute('select count(*) from customers')).rows[0].count;
        expect(c2).toStrictEqual(c);
      });
    } catch (ignored) {
      //
    }
    const c3 = (await client.execute('select count(*) from customers')).rows[0].count;
    expect(c3).toStrictEqual(c);
  });

  it('should commit can be called in execute(callback)', async function () {
    const c = (await client.execute('select count(*) from customers')).rows[0].count;
    const given = 'X' + Math.floor(Math.random() * 10000);
    await client.acquire(async connection => {
      await connection.execute(Insert('customers', { given_name: Param('given') }), { params: { given } });
      const c2 = (await connection.execute('select count(*) from customers')).rows[0].count;
      expect(c2).toStrictEqual(c + 1);
      await connection.commit();
    });
    const c3 = (await client.execute('select count(*) from customers')).rows[0].count;
    expect(c3).toStrictEqual(c + 1);
  });

  it('should rollback can be called in execute(callback)', async function () {
    const c = (await client.execute('select count(*) from customers')).rows[0].count;
    await client.acquire(async connection => {
      await connection.startTransaction();
      const given = 'X' + Math.floor(Math.random() * 10000);
      await connection.execute(Insert('customers', { given_name: Param('given') }), { params: { given } });
      await connection.rollback();
    });
    const c2 = (await client.execute('select count(*) from customers')).rows[0].count;
    expect(c2).toStrictEqual(c);
  });

  it('should get and set active schema of connection', async function () {
    await client.acquire(async connection => {
      const schema = await connection.getSchema();
      expect(schema).toBeDefined();
      await connection.setSchema('postgres');
      expect(await connection.getSchema()).toStrictEqual('postgres');
      await connection.setSchema(schema);
      expect(await connection.getSchema()).toStrictEqual(schema);
    });
  });

  it('should use defaults.objectRows option', async function () {
    client.defaults.objectRows = false;
    let result = await client.execute('select * from customers');
    expect(Array.isArray(result.rows[0])).toBeTruthy();
    client.defaults.objectRows = undefined;
    result = await client.execute('select * from customers');
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
  });

  it('should use defaults.fieldNaming option', async function () {
    client.defaults.fieldNaming = 'lowercase';
    let result = await client.execute('select 1 as test_field');
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0].test_field).toStrictEqual(1);

    client.defaults.fieldNaming = 'uppercase';
    result = await client.execute('select 1 as test_field');
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0].TEST_FIELD).toStrictEqual(1);

    client.defaults.fieldNaming = 'camelcase';
    result = await client.execute('select 1 as test_field');
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0].testField).toStrictEqual(1);

    client.defaults.fieldNaming = 'pascalcase';
    result = await client.execute('select 1 as test_field');
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(!Array.isArray(result.rows[0])).toBeTruthy();
    expect(result.rows[0].TestField).toStrictEqual(1);
    client.defaults.fieldNaming = undefined;
  });

  it('should set defaults.showSql option', async function () {
    client.defaults.showSql = true;
    const result = await client.execute('select * from customers');
    expect(result.query!.sql).toStrictEqual('select * from customers');
    client.defaults.showSql = undefined;
  });

  it('should set defaults.showSql option', async function () {
    client.defaults.showSql = true;
    client.defaults.autoCommit = true;
    const result = await client.execute('select * from customers');
    expect(result.query!.autoCommit).toStrictEqual(true);
    client.defaults.showSql = undefined;
  });

  it('should set defaults.ignoreNulls option', async function () {
    client.defaults.ignoreNulls = true;
    let result = await client.execute(Select().from('customers').where({ id: insertedIds[0] }));
    expect(result.rows[0].city).toStrictEqual(undefined);
    client.defaults.ignoreNulls = undefined;
    result = await client.execute(Select().from('customers').where({ id: insertedIds[0] }));
    expect(result.rows[0].city).toStrictEqual(null);
  });

  it('should emit `execute` event', async function () {
    let i = 0;
    const fn = () => i++;
    client.once('execute', fn);
    await client.execute('select * from customers');
    expect(i).toStrictEqual(1);
  });

  it('should emit `connection-return` event when connection returns to the pool', function (done) {
    client.once('connection-return', () => done());
    void client.execute('select 1').catch(done);
  });
});
