import { Select } from '@sqb/builder';
import { Cursor, SqbClient } from '@sqb/connect';
import { SqbConnection } from '../../src/client/sqb-connection.js';
import { initClient } from '../_support/init-client.js';

describe('Cursor', () => {
  let client: SqbClient;
  let cursor: Cursor | undefined;

  beforeAll(async () => {
    client = await initClient({ defaults: { cursor: true, objectRows: true } });
  });

  afterAll(async () => {
    await client.close(0);
  });

  it('should return Cursor for select queries', async () => {
    const result = await client.execute(Select().from('customers'));
    cursor = result && result.cursor;
    expect(cursor).toBeDefined();
    expect(cursor!.isBof).toStrictEqual(true);
    expect(cursor!.inspect()).toStrictEqual('[object Cursor]');
    expect(cursor!.connection).toBeDefined();
    return cursor!.close();
  });

  it('should iterate rows', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      let row;
      let i = 0;
      let id = '';
      expect(cursor!.isBof).toStrictEqual(true);
      expect(cursor!.isEof).toStrictEqual(false);
      while ((row = await cursor!.next())) {
        expect(cursor!.isBof).toStrictEqual(false);
        expect(row.id).not.toStrictEqual(id);
        id = row.id;
        expect(cursor!.rowNum).toStrictEqual(++i);
      }
      expect(cursor!.isBof).toStrictEqual(false);
      await cursor!.next();
      expect(cursor!.isEof).toStrictEqual(true);
    });
  });

  it('should automatically close cursor when connection closed (manuel)', done => {
    Promise.resolve()
      .then(async () => {
        const connection = await client.acquire();
        const result = await connection.execute(Select().from('customers'));
        cursor = result && result.cursor;
        expect(cursor).toBeDefined();
        cursor!.on('close', done);
        connection.release();
      })
      .catch(done);
  });

  it('should automatically close cursor when after acquire block', done => {
    Promise.resolve()
      .then(async () =>
        client.acquire(async connection => {
          const result = await connection.execute(Select().from('customers'));
          cursor = result && result.cursor;
          expect(cursor).toBeDefined();
          cursor!.on('close', done);
        }),
      )
      .catch(done);
  });

  it('should automatically close connection when cursor closed', done => {
    Promise.resolve()
      .then(async () => {
        const result = await client.execute(Select().from('customers'));
        cursor = result && result.cursor;
        expect(cursor).toBeDefined();
        cursor!.connection.once('close', done);
        await cursor!.close();
      })
      .catch(done);
  });

  it('should seek() move cursor', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      let curRow = NaN;
      cursor!.on('move', (row, rowNum) => {
        curRow = rowNum;
      });
      await cursor!.seek(10);
      expect(cursor!.isBof).toStrictEqual(false);
      expect(cursor!.rowNum).toStrictEqual(10);
      expect(cursor!.row).toBeDefined();
      expect(cursor!.rowNum).toStrictEqual(curRow);
    });
  });

  it('should seek(big number) move cursor to eof', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      await cursor!.seek(10000);
      expect(cursor!.isBof).toStrictEqual(false);
      expect(cursor!.isEof).toStrictEqual(true);
      expect(!cursor!.row).toBeDefined();
      expect(cursor!.rowNum).toBeGreaterThan(100);
    });
  });

  it('should cache rows', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'), {
        fetchRows: 100,
      });
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      await cursor!.seek(50);
      expect((cursor as any)._cache.length).toStrictEqual(100);
    });
  });

  it('should seek(big number) move cursor to eof (cached)', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      await cursor!.seek(10000);
      expect(cursor!.isBof).toStrictEqual(false);
      expect(cursor!.isEof).toStrictEqual(true);
      expect(cursor!.row).toBeUndefined();
      expect(cursor!.rowNum).toBeGreaterThan(100);
      expect((cursor as any)._cache.length).toStrictEqual(cursor!.rowNum - 1);
    });
  });

  it('should move cursor back if cached', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'), {
        objectRows: true,
      });
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      await cursor!.seek(10);
      expect(cursor!.rowNum).toStrictEqual(10);
      const id = cursor!.row.id;
      await cursor!.seek(40);
      expect(cursor!.rowNum).toStrictEqual(50);
      await cursor!.moveTo(10);
      expect(cursor!.rowNum).toStrictEqual(10);
      expect(cursor!.row.id).toStrictEqual(id);
      await cursor!.prev();
      expect(cursor!.rowNum).toStrictEqual(9);
    });
  });

  it('should seek(0) do nothing', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      await cursor!.seek(50);
      expect(cursor!.rowNum).toStrictEqual(50);
      await cursor!.seek(0);
      expect(cursor!.rowNum).toStrictEqual(50);
    });
  });

  it('should reset cursor in cached mode', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      await cursor!.seek(50);
      expect(cursor!.rowNum).toStrictEqual(50);
      cursor!.reset();
      expect(cursor!.rowNum).toStrictEqual(0);
    });
  });

  it('should not reset cursor in non cached mode', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      expect(() => cursor!.reset()).toThrow('method needs cache to be enabled');
    });
  });

  it('should fetchAll() emit eof', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      let eofCalled = false;
      cursor!.on('eof', () => (eofCalled = true));
      await cursor!.fetchAll();
      expect(eofCalled).toStrictEqual(true);
    });
  });

  it('should fetchAll() does not emit "move" event', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      cursor!.cached();
      let moveCalled = false;
      cursor!.on('move', () => {
        moveCalled = true;
      });
      await cursor!.fetchAll();
      expect(moveCalled).toStrictEqual(false);
    });
  });

  it('should close cursor after fetched all rows', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      let closeCalled = false;
      cursor!.on('close', () => {
        closeCalled = true;
      });
      while (await cursor!.next()) {
        //
      }
      expect(closeCalled).toStrictEqual(true);
    });
  });

  it('should not fetch rows if closed', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      await cursor!.close();
      expect(await cursor!.next()).toBeUndefined();
    });
  });

  it('should cache can not be enabled after fetch', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      await cursor!.next();
      expect(() => cursor!.cached()).toThrow(
        'Cache can be enabled before fetching rows',
      );
    });
  });

  it('should handle close error', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      (cursor as any)._intlcur.close = () =>
        Promise.reject(new Error('Any error'));
      await expect(() => cursor!.close()).rejects.toThrow('Any error');
    });
  });

  it('should handle adapter errors', async () => {
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(Select().from('customers'));
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      (cursor as any)._intlcur.fetch = () =>
        Promise.reject(new Error('Any error'));
      await expect(() => cursor!.next()).rejects.toThrow('Any error');
    });
  });

  it('should queries call `fetch` events on fetching new rows', async () => {
    let l = 0;
    const query = Select()
      .from('customers')
      .onFetch(row => (row.customField = ++l));
    await client.acquire(async (connection: SqbConnection) => {
      const result = await connection.execute(query, { fetchRows: 100 });
      cursor = result && result.cursor;
      expect(cursor).toBeDefined();
      await cursor!.seek(10);
      expect(cursor!.rowNum).toStrictEqual(10);
      expect(l).toStrictEqual(100);
      expect(cursor!.row.customField).toStrictEqual(10);
    });
  });
});
