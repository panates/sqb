import '../src/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SqbClient } from '@sqb/connect';
import { expect } from 'expect';

describe('sqlite:SqliteConnection', () => {
  let dir: string;
  let client: SqbClient;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqb-sqlite-'));
    client = new SqbClient({
      driver: 'sqlite',
      database: path.join(dir, 'test.db'),
    });
  });

  after(async () => {
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should run a statement that has no result set', async () => {
    await client.execute('create table t1 (id integer primary key, v text)');
    await client.execute("insert into t1 (id, v) values (1, 'a')");
    const r = await client.execute('select v from t1 where id = 1');
    expect(r.rows).toEqual([{ v: 'a' }]);
  });

  it('should report rows affected by "insert or replace"', async () => {
    const r = await client.execute(
      "insert or replace into t1 (id, v) values (1, 'b')",
    );
    expect(r.rowsAffected).toStrictEqual(1);
    const r2 = await client.execute('select v from t1 where id = 1');
    expect(r2.rows).toEqual([{ v: 'b' }]);
  });
});
