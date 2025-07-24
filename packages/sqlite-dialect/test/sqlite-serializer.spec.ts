import { Param, Select, SerializerRegistry } from '@sqb/builder';
import { expect } from 'expect';
import { SqliteSerializer } from '../src/sqlite-serializer.js';

describe('sqlite-dialect:SqliteSerializer', () => {
  const postgresSerializer = new SqliteSerializer();
  before(() => SerializerRegistry.register(postgresSerializer));
  after(() => SerializerRegistry.unRegister(postgresSerializer));

  it('should serialize "limit"', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10');
  });

  it('should serialize "offset"', () => {
    const query = Select().from('table1').offset(4);
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual('select * from table1 OFFSET 4');
  });

  it('should serialize "limit" pretty print', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({
      dialect: 'sqlite',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10');
  });

  it('should serialize "offset" pretty print', () => {
    const query = Select().from('table1').offset(10);
    const result = query.generate({
      dialect: 'sqlite',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nOFFSET 10');
  });

  it('should serialize "limit/offset"', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10 OFFSET 4');
  });

  it('should serialize "limit/offset" pretty print', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({
      dialect: 'sqlite',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10 OFFSET 4');
  });

  it('Should serialize params', () => {
    const query = Select()
      .from('table1')
      .where({ ID: Param('ID') });
    const result = query.generate({
      dialect: 'sqlite',
      params: { ID: 5 },
    });
    expect(result.sql).toStrictEqual('select * from table1 where ID = :ID');
    expect(result.params).toStrictEqual({ ID: 5 });
  });
});
