import fs from 'node:fs';
import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { closeMemoryDatabase } from '../src/index.js';

describe('sqlite:in-memory databases', () => {
  const clients: SqbClient[] = [];

  const open = (database: string) => {
    const client = new SqbClient({ driver: 'sqlite', database });
    clients.push(client);
    return client;
  };

  after(async () => {
    for (const c of clients) await c.close();
    await closeMemoryDatabase(':memory:mem1');
    await closeMemoryDatabase(':memory:mem2');
  });

  it('should keep a named in-memory database in memory', async () => {
    const client = open(':memory:mem1');
    await client.execute('create table t1 (id integer primary key)');
    expect(fs.existsSync(':memory:mem1')).toBe(false);
  });

  it('should share a named in-memory database between connections', async () => {
    const client = open(':memory:mem1');
    await client.execute('insert into t1 (id) values (1)');
    const r = await client.execute('select id from t1');
    expect(r.rows).toEqual([{ id: 1 }]);
  });

  it('should keep differently named in-memory databases apart', async () => {
    const client = open(':memory:mem2');
    await expect(client.execute('select id from t1')).rejects.toThrow(
      /no such table/,
    );
  });
});
