import {
  Eq,
  Insert,
  Param,
  Select,
  SerializerRegistry,
  Update,
} from '@sqb/builder';
import { expect } from 'expect';
import { MariadbSerializer } from '../src/mariadb-serializer.js';

describe('mariadb-dialect:MariadbSerializer', () => {
  const mariadbSerializer = new MariadbSerializer();
  before(() => SerializerRegistry.register(mariadbSerializer));
  after(() => SerializerRegistry.unRegister(mariadbSerializer));

  it('should replace "= null" to "is null": test1', () => {
    const query = Select().from('table1').where({ ID: null });
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "= null" to "is null": test2', () => {
    const query = Select().from('table1').where(Eq('ID', null));
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "!= null" to "is not null"', () => {
    const query = Select().from('table1').where({ 'ID !=': null });
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID is not null',
    );
  });

  it('should serialize reserved word', () => {
    const query = Select('call').from('table1');
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select "call" from table1');
  });

  it('should serialize a MariaDB-only reserved word not reserved by MySQL', () => {
    const query = Select('offset').from('table1');
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select "offset" from table1');
  });

  it('should serialize "limit"', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10');
  });

  it('should serialize "offset" (requires a LIMIT clause in MariaDB)', () => {
    const query = Select().from('table1').offset(4);
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual(
      'select * from table1 LIMIT 18446744073709551615 OFFSET 4',
    );
  });

  it('should serialize "limit/offset"', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10 OFFSET 4');
  });

  it('should serialize "limit" pretty print', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'mariadb', prettyPrint: true });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10');
  });

  it('should serialize params', () => {
    const query = Select()
      .from('table1')
      .where(Eq('ID', Param('ID')));
    const result = query.generate({
      dialect: 'mariadb',
      params: { ID: 5 },
    });
    expect(result.sql).toStrictEqual('select * from table1 where ID = :ID');
    expect(result.params).toStrictEqual({ ID: 5 });
  });

  it('should serialize array parameter with "in" operator', () => {
    const query = Select()
      .from('table1')
      .where(Eq('ID', Param('ID')));
    const result = query.generate({
      dialect: 'mariadb',
      params: { ID: [1, 2, 3] },
    });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID in (1,2,3)',
    );
    expect(result.params).not.toBeDefined();
  });

  it('should serialize boolean values as 1/0', () => {
    const query = Select().from('table1').where({ active: true });
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual('select * from table1 where active = 1');
  });

  it('should NOT strip the RETURNING clause on INSERT (unlike MySQL)', () => {
    const query = Insert('table1', { id: 1, name: 'aaa' }).returning(
      'id',
      'name',
    );
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual(
      "insert into table1 (id, name) values (1, 'aaa') returning id, name",
    );
  });

  // Note: @sqb/builder's Delete class doesn't currently expose a
  // .returning() method (only Insert/Update do), so DELETE ... RETURNING
  // can't be constructed through the query builder yet. The dialect and
  // adapter still handle it correctly at the SQL-text level for forward
  // compatibility, but there's nothing to test through the builder API
  // today.

  it('should strip the RETURNING clause on UPDATE (MariaDB does not support it)', () => {
    const query = Update('table1', { name: 'aaa' })
      .where(Eq('id', 1))
      .returning('id');
    const result = query.generate({ dialect: 'mariadb' });
    expect(result.sql).toStrictEqual(
      "update table1 set name = 'aaa' where id = 1",
    );
  });
});
