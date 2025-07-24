import { Select } from '@sqb/builder';
import { Cursor, SqbClient } from '@sqb/connect';
import { expect } from 'expect';
import { Readable } from 'stream';
import { SqbConnection } from '../../src/client/sqb-connection.js';
import { initClient } from '../_support/init-client.js';

function readStream(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let bytes = Buffer.from('');
    stream.on('data', (chunk): void => {
      bytes = Buffer.concat([bytes, chunk]);
    });
    stream.on('end', () => {
      try {
        resolve(bytes.toString());
      } catch (err) {
        reject(err);
      }
    });
  });
}

function readObjectStream(stream: Readable): Promise<any> {
  return new Promise((resolve, reject) => {
    const arr: any[] = [];
    stream.on('data', (chunk): void => {
      arr.push(chunk);
    });
    stream.on('end', () => {
      try {
        resolve(arr);
      } catch (err) {
        reject(err);
      }
    });
  });
}

describe('connect:CursorStream', () => {
  let client: SqbClient;
  let cursor: Cursor;

  before(async () => {
    client = await initClient({ defaults: { cursor: true, objectRows: true } });
  });

  after(async () => {
    await client.close(0);
  });

  it('should stream string buffer', async () => {
    await client.acquire(async (session: SqbConnection) => {
      const result = await session.execute(Select().from('customers'));
      cursor = result && result.cursor;
      const stream = cursor.toStream();
      const buf = await readStream(stream);
      expect(typeof buf).toStrictEqual('string');
      const obj = JSON.parse(buf);
      expect(Array.isArray(obj)).toBeTruthy();
      expect(stream.isClosed).toStrictEqual(true);
    });
  });

  it('should stream row object if objectMode enabled', async () => {
    await client.acquire(async (session: SqbConnection) => {
      const result = await session.execute(Select().from('customers'));
      cursor = result && result.cursor;
      const stream = cursor.toStream({ objectMode: true });
      const arr = await readObjectStream(stream);
      expect(Array.isArray(arr)).toStrictEqual(true);
      expect(stream.isClosed).toStrictEqual(true);
    });
  });

  it('should cursor.close() also close the stream', done => {
    client
      .acquire(async (session: SqbConnection) => {
        const result = await session.execute(Select().from('customers'));
        cursor = result && result.cursor;
        const stream = cursor.toStream();
        stream.on('close', () => done());
        await cursor.close();
      })
      .catch(done);
  });

  it('should handle cursor errors', done => {
    client
      .acquire(async (session: SqbConnection) => {
        const result = await session.execute(Select().from('customers'));
        cursor = result && result.cursor;
        (cursor as any)._intlcur.close = () =>
          Promise.reject(new Error('Any error'));
        const stream = cursor.toStream();
        stream.once('error', () => {
          delete result.cursor._intlcur.close;
          stream.close().then(done).catch(done);
        });
        stream.close().catch(() => 0);
      })
      .catch(done);
  });
});
