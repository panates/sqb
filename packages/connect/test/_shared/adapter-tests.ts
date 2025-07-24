import { DataType, Insert, Param, Query, Select, Update } from '@sqb/builder';
import {
  Adapter,
  AdapterRegistry,
  ClientConfiguration,
  QueryRequest,
} from '@sqb/connect';
import { getDirname } from 'cross-dirname';
import { expect } from 'expect';
import fs from 'fs';
import path from 'path';

export function initAdapterTests(
  adapter: Adapter,
  config?: Partial<ClientConfiguration>,
) {
  let connection!: Adapter.Connection;
  let lastInsertId;
  const clientConfig: ClientConfiguration = {
    ...config,
    driver: adapter.driver,
    pool: {
      validation: true,
      max: 1,
    },
  };

  before(() => AdapterRegistry.register(adapter));
  after(() => AdapterRegistry.unRegister(adapter));
  afterEach(() => connection && connection.close());

  async function adapterExecute(
    query: Query,
    opts?: Partial<QueryRequest>,
  ): Promise<Adapter.Response & { objRows: any[] }> {
    const q = query.generate({
      dialect: adapter.dialect,
      params: opts?.params,
    });
    const result: any = await connection.execute({
      ...opts,
      sql: q.sql,
      params: q.params,
      returningFields: q.returningFields,
      autoCommit: !(opts?.autoCommit === false),
    });
    if (result.rows) {
      result.objRows = result.rows.reduce((target, row) => {
        const r: any = {};
        for (const [i, f] of result.fields.entries()) {
          r[f.fieldName.toLowerCase()] =
            result.rowType === 'array' ? row[i] : row[f.fieldName];
        }
        target.push(r);
        return target;
      }, []);
    }

    return result;
  }

  it(
    'should create connection instance with ' + adapter.driver + ' driver',
    async () => {
      connection = await adapter.connect(clientConfig);
      expect(connection).toBeDefined();
    },
  ).timeout(10000);

  if (adapter.features?.schema) {
    it('should set active working schema', async () => {
      connection = await adapter.connect(clientConfig);
      expect(clientConfig.schema).toBeDefined();
      await expect(
        connection.setSchema!(clientConfig.schema || ''),
      ).resolves.not.toThrow();
    });

    it('should get active working schema', async () => {
      connection = await adapter.connect(clientConfig);
      expect((await connection.getSchema!()).toUpperCase()).toStrictEqual(
        (clientConfig.schema || '').toUpperCase(),
      );
    });
  }

  it('should execute a select query and return fields and rows (objectRows=false)', async () => {
    connection = await adapter.connect(clientConfig);
    const query = Select('id').from('customers').orderBy('id').limit(10);
    const result = await adapterExecute(query, { objectRows: false });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toBeGreaterThan(0);
    expect(result.rowType).toBeDefined();
    expect(result.fields).toBeDefined();
    expect(result.objRows[0].id).toStrictEqual(1);
  });

  it('should execute a select query and return fields and rows (objectRows=true)', async () => {
    connection = await adapter.connect(clientConfig);
    const query = Select('id').from('customers').orderBy('id');
    const result = await adapterExecute(query, { objectRows: true });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toBeGreaterThan(0);
    expect(result.fields).toBeDefined();
    expect(result.objRows[0].id).toStrictEqual(1);
  });

  it('should return cursor', async () => {
    if (!adapter.features?.cursor) {
      return;
    }
    connection = await adapter.connect(clientConfig);
    const query = Select('id').from('customers').orderBy('id');
    const result = await adapterExecute(query, {
      objectRows: false,
      cursor: true,
    });
    expect(result).toBeDefined();
    expect(result.rowType).toBeDefined();
    expect(result.fields).toBeDefined();
    expect(result.cursor).toBeDefined();
    const rows = await result.cursor!.fetch(1);
    expect(rows).toBeDefined();
    expect(rows!.length).toStrictEqual(1);
    if (result.rowType === 'array') expect(rows![0][0]).toStrictEqual(1);
    else expect(rows![0][result.fields![0].fieldName]).toStrictEqual(1);
  });

  it('should fetchRows option limit row count', async () => {
    connection = await adapter.connect(clientConfig);
    const query = Select('id').from('customers').orderBy('id');
    const result = await adapterExecute(query, {
      objectRows: false,
      fetchRows: 5,
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toStrictEqual(5);
  });

  if (adapter.features?.fetchAsString?.includes(DataType.DATE)) {
    it('should fetch date fields as string (fetchAsString)', async () => {
      connection = await adapter.connect(clientConfig);
      const query = Select('birth_date').from('customers');
      const result = await adapterExecute(query, {
        objectRows: false,
        fetchRows: 1,
        fetchAsString: [DataType.DATE],
      });
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows!.length).toStrictEqual(1);
      expect(typeof result.rows![0][0]).toStrictEqual('string');
    });
  }

  if (adapter.features?.fetchAsString?.includes(DataType.TIMESTAMP)) {
    it('should fetch timestamp fields as string (fetchAsString)', async () => {
      connection = await adapter.connect(clientConfig);
      const query = Select('created_at').from('customers');
      const result = await adapterExecute(query, {
        objectRows: false,
        fetchRows: 1,
        fetchAsString: [DataType.TIMESTAMP],
      });
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows!.length).toStrictEqual(1);
      expect(typeof result.rows![0][0]).toStrictEqual('string');
    });
  }

  it('should return error if sql is invalid', async () => {
    connection = await adapter.connect(clientConfig);
    await expect(() =>
      connection.execute({ sql: 'invalid sql' }),
    ).rejects.toBeDefined();
  });

  it('should insert record with returning', async () => {
    connection = await adapter.connect(clientConfig);
    const givenName = 'X' + Math.floor(Math.random() * 1000000);
    const familyName = 'X' + Math.floor(Math.random() * 1000000);
    const query = Insert('customers', {
      given_name: givenName,
      family_name: familyName,
    }).returning('id');
    const result = await adapterExecute(query, {
      autoCommit: true,
      objectRows: false,
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rowsAffected).toStrictEqual(1);
    expect(result.objRows[0].id).toBeGreaterThan(0);
    lastInsertId = result.objRows[0].id;
  });

  it('should execute script with parameters', async () => {
    connection = await adapter.connect(clientConfig);
    const givenName = 'X' + Math.floor(Math.random() * 1000000);
    const familyName = 'X' + Math.floor(Math.random() * 1000000);
    const query = Insert('customers', {
      given_name: Param('givenName'),
      family_name: Param('familyName'),
    }).returning('id', 'given_name', 'family_name');
    const result = await adapterExecute(query, {
      autoCommit: true,
      params: { givenName, familyName },
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rowsAffected).toStrictEqual(1);
    expect(result.objRows[0].id).toBeGreaterThan(0);
    expect(result.objRows[0].given_name).toStrictEqual(givenName);
    expect(result.objRows[0].family_name).toStrictEqual(familyName);
  });

  it('should update record with returning', async () => {
    connection = await adapter.connect(clientConfig);
    const city = 'X' + Math.floor(Math.random() * 10000);
    const query = Update('customers', { city })
      .where({ id: lastInsertId })
      .returning('city');
    const result = await adapterExecute(query, {
      autoCommit: true,
      objectRows: false,
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.rowsAffected).toStrictEqual(1);
    expect(result.objRows[0].city).toStrictEqual(city);
  });

  it('should commit a transaction', async () => {
    connection = await adapter.connect(clientConfig);
    let r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.rows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    const oldCity = r.objRows[0].city;

    await connection.startTransaction();

    const newCity = 'X' + Math.floor(Math.random() * 10000);
    await adapterExecute(
      Update('customers', { city: newCity }).where({ id: lastInsertId }),
      { autoCommit: false },
    );
    const result = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
      { autoCommit: false },
    );
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.objRows[0].id).toStrictEqual(lastInsertId);
    expect(result.objRows[0].city).toStrictEqual(newCity);
    expect(result.objRows[0].city).not.toStrictEqual(oldCity);
    await connection.commit();

    r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.rows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    expect(r.objRows[0].city).not.toStrictEqual(oldCity);
    expect(r.objRows[0].city).toStrictEqual(newCity);
  });

  it('should rollback a transaction', async () => {
    connection = await adapter.connect(clientConfig);
    let r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.objRows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    const oldCity = r.objRows[0].city;

    await connection.startTransaction();
    const city = 'X' + Math.floor(Math.random() * 10000);
    await adapterExecute(
      Update('customers', { city }).where({ id: lastInsertId }),
      { autoCommit: false },
    );
    const result = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
      { autoCommit: false },
    );
    expect(result).toBeDefined();
    expect(result.objRows).toBeDefined();
    expect(result.objRows[0].id).toStrictEqual(lastInsertId);
    expect(result.objRows[0].city).toStrictEqual(city);
    expect(result.objRows[0].city).not.toStrictEqual(oldCity);
    await connection.rollback();

    r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.rows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    expect(r.objRows[0].city).toStrictEqual(oldCity);
  });

  it('should start transaction when autoCommit is off', async () => {
    connection = await adapter.connect(clientConfig);
    let r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.rows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    const oldCity = r.objRows[0].city;

    const city = 'X' + Math.floor(Math.random() * 10000);
    await adapterExecute(
      Update('customers', { city }).where({ id: lastInsertId }),
      { autoCommit: false },
    );
    const result = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
      { autoCommit: false },
    );
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
    expect(result.objRows[0].id).toStrictEqual(lastInsertId);
    expect(result.objRows[0].city).toStrictEqual(city);
    expect(result.objRows[0].city).not.toStrictEqual(oldCity);
    await connection.rollback();

    r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.rows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    expect(r.objRows[0].city).toStrictEqual(oldCity);
  });

  it('should commit a transaction when autoCommit is on', async () => {
    connection = await adapter.connect(clientConfig);
    let r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.objRows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    const oldCity = r.objRows[0].city;
    const newCity = 'X' + Math.floor(Math.random() * 10000);
    await adapterExecute(
      Update('customers', { city: newCity }).where({ id: lastInsertId }),
      { autoCommit: true },
    );
    const result = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(result).toBeDefined();
    expect(result.objRows).toBeDefined();
    expect(result.objRows[0].id).toStrictEqual(lastInsertId);
    expect(result.objRows[0].city).toStrictEqual(newCity);
    expect(result.objRows[0].city).not.toStrictEqual(oldCity);
    await connection.rollback();

    r = await adapterExecute(
      Select().from('customers').where({ id: lastInsertId }),
    );
    expect(r).toBeDefined();
    expect(r.objRows).toBeDefined();
    expect(r.objRows[0].id).toStrictEqual(lastInsertId);
    expect(r.objRows[0].city).not.toStrictEqual(oldCity);
    expect(r.objRows[0].city).toStrictEqual(newCity);
  });

  it('should call startTransaction() more than one', async () => {
    connection = await adapter.connect(clientConfig);
    await connection.startTransaction();
    await connection.startTransaction();
  });

  it('should call commit() more than one', async () => {
    connection = await adapter.connect(clientConfig);
    await connection.startTransaction();
    await connection.commit();
    await connection.commit();
  });

  it('should call rollback() more than one', async () => {
    connection = await adapter.connect(clientConfig);
    await connection.startTransaction();
    await connection.rollback();
    await connection.rollback();
  });
}

export function getInsertSQLsForTestData(opts: {
  dialect: string;
  schema?: string;
  stringifyValueForSQL?: (v: any) => string;
}) {
  const result: { table: string; scripts: string[] }[] = [];
  const repositoryRoot = path.resolve(getDirname(), '../../../..');

  const dataFiles: any[] = [
    'continents',
    'countries',
    'customers',
    'customer_details',
    'customer_vip_details',
    'tags',
    'customer_tags',
  ].map(f =>
    JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, 'support/test-data', f + '.json'),
        'utf8',
      ),
    ),
  );

  for (const table of dataFiles) {
    const file = { table, scripts: [] as string[] };
    for (const row of table.rows) {
      const x = Insert(
        (opts.schema ? opts.schema + '.' : '') + table.name,
        row,
      ).generate({ dialect: opts.dialect });
      file.scripts.push(x.sql);
    }
    result.push(file);
  }

  return result;
}

export function stringifyValueForSQL(v: any): string {
  if (v == null) return 'null';
  if (typeof v === 'string') return "'" + v.replace(/'/g, "\\'") + "'";
  return '' + v;
}
