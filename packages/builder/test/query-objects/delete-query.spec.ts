import { expect } from 'expect';
import { Delete, Eq, Raw, SerializationType } from '../../src/index.js';

describe('builder:Serialize delete query', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize DeleteQuery', () => {
    const q = Delete('table1');
    expect(q && q._type).toStrictEqual(SerializationType.DELETE_QUERY);
  });

  it('should serialize delete', () => {
    const query = Delete('table1').where(Eq('id', 1));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('delete from table1 where id = 1');
  });

  it('should pass raw as table name', () => {
    const query = Delete(Raw('table1'));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('delete from table1');
  });

  it('should validate first (tableName) argument', () => {
    expect(
      // @ts-ignore
      () => Delete(null),
    ).toThrow('required as first argument');
  });
});
