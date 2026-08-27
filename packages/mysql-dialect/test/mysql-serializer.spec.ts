import { Eq, Param, Select, SerializerRegistry } from '@sqb/builder';
import { expect } from 'expect';
import { MysqlSerializer } from '../src/mysql-serializer.js';

describe('mysql-dialect:MysqlSerializer', () => {
  const mysqlSerializer = new MysqlSerializer();
  before(() => SerializerRegistry.register(mysqlSerializer));
  after(() => SerializerRegistry.unRegister(mysqlSerializer));

  it('should replace "= null" to "is null": test1', () => {
    const query = Select().from('table1').where({ ID: null });
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "= null" to "is null": test2', () => {
    const query = Select().from('table1').where(Eq('ID', null));
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "!= null" to "is not null"', () => {
    const query = Select().from('table1').where({ 'ID !=': null });
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID is not null',
    );
  });

  it('should serialize reserved word', () => {
    const query = Select('call').from('table1');
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual('select "call" from table1');
  });

  it('should serialize "limit"', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10');
  });

  it('should serialize "offset" (requires a LIMIT clause in MySQL)', () => {
    const query = Select().from('table1').offset(4);
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 LIMIT 18446744073709551615 OFFSET 4',
    );
  });

  it('should serialize "limit/offset"', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10 OFFSET 4');
  });

  it('should serialize "limit" pretty print', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'mysql', prettyPrint: true });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10');
  });

  it('should serialize params', () => {
    const query = Select()
      .from('table1')
      .where(Eq('ID', Param('ID')));
    const result = query.generate({
      dialect: 'mysql',
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
      dialect: 'mysql',
      params: { ID: [1, 2, 3] },
    });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID in (1,2,3)',
    );
    expect(result.params).not.toBeDefined();
  });

  it('should serialize boolean values as 1/0', () => {
    const query = Select().from('table1').where({ active: true });
    const result = query.generate({ dialect: 'mysql' });
    expect(result.sql).toStrictEqual('select * from table1 where active = 1');
  });
});
