import '../src/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Eq, InnerJoin, Match, Param, Raw, Select } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';
import { toFtsQuery } from '@sqb/sqlite-dialect';
import { expect } from 'expect';

describe('sqlite:Match with FTS5', () => {
  let dir: string;
  let client: SqbClient;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqb-fts-'));
    client = new SqbClient({
      driver: 'sqlite',
      database: path.join(dir, 'logs.db'),
    });
    for (const sql of [
      'create table workers (id integer primary key, name text)',
      'create table logs (id integer primary key, worker_id integer, message text)',
      "create virtual table logs_fts using fts5(message, content='logs', content_rowid='id')",
      `create trigger logs_ai after insert on logs begin
  insert into logs_fts(rowid, message) values (new.id, new.message);
end`,
      "insert into workers (id, name) values (1, 'monitor'), (2, 'gateway')",
      "insert into logs (worker_id, message) values (1, 'received ORU^R01 from monitor')",
      "insert into logs (worker_id, message) values (2, 'connection refused by host')",
      "insert into logs (worker_id, message) values (2, 'connection established')",
    ])
      await client.execute(sql);
  });

  after(async () => {
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const ids = async (query: any, text: string) => {
    const r = await client.execute(query, {
      params: { text },
      objectRows: true,
    });
    return (r.rows || []).map((row: any) => row.id);
  };

  it('should search the FTS5 table itself', async () => {
    const query = Select('rowid as id')
      .from('logs_fts')
      .where(Match('message', Param('text')))
      .orderBy('rowid');
    expect(await ids(query, 'connection')).toEqual([2, 3]);
  });

  it('should find the rows of a table through its FTS5 index', async () => {
    const query = Select('id')
      .from('logs')
      .where(Match('message', Param('text'), 'logs_fts'))
      .orderBy('id');
    expect(await ids(query, 'connection')).toEqual([2, 3]);
    expect(await ids(query, toFtsQuery('connection host'))).toEqual([2]);
  });

  it('should compare the FTS5 rowids with the key given', async () => {
    const query = Select('l.id')
      .from('logs l')
      .join(InnerJoin('workers w').on(Eq('w.id', Raw('l.worker_id'))))
      .where(
        Match('l.message', Param('text'), { table: 'logs_fts', key: 'l.id' }),
      )
      .orderBy('l.id');
    expect(await ids(query, 'connection')).toEqual([2, 3]);
  });

  it('should search the words of user input as they are', async () => {
    const query = Select('id')
      .from('logs')
      .where(Match('message', Param('text'), 'logs_fts'));
    expect(await ids(query, toFtsQuery('ORU^R01'))).toEqual([1]);
    expect(await ids(query, toFtsQuery('ORU^R01 refused'))).toEqual([]);
  });
});
