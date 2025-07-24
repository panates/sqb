import { expect } from 'expect';
import {
  Eq,
  Param,
  Raw,
  Select,
  SerializationType,
  Update,
} from '../../src/index.js';

describe('builder:Serialize update query', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize UpdateQuery', () => {
    const q = Update('table1', { id: 1 });
    expect(q && q._type).toStrictEqual(SerializationType.UPDATE_QUERY);
  });

  it('should serialize update', () => {
    const query = Update('table1', { id: 2, name: 'aaa' }).where(Eq('id', 1));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      "update table1 set id = 2, name = 'aaa' where id = 1",
    );
  });

  it('should pass raw as table name', () => {
    const query = Update(Raw('table1'), { id: 2, name: 'aaa' }).where(
      Eq('id', 1),
    );
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      "update table1 set id = 2, name = 'aaa' where id = 1",
    );
  });

  it('should use select query as value', () => {
    const query = Update('table1', {
      id: 2,
      name: Select('name').from('table2'),
    }).where(Eq('id', 1));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'update table1 set id = 2, name = (select name from table2) where id = 1',
    );
  });

  it('should validate first (tableName) argument', () => {
    expect(() =>
      // @ts-ignore
      Update(null, { id: 1, name: 'aaa' }),
    ).toThrow('required as first argument');
  });

  it('should validate second (values) argument', () => {
    expect(() => Update('table1', [1, 'aaa'])).toThrow(
      'instance required as second argument',
    );
    expect(() => Update('table1', 'sdfds')).toThrow(
      'instance required as second argument',
    );
  });

  it('should serialize params with "values" argument: COLON', () => {
    const query = Update('table1', { id: Param('id'), name: Param('name') });
    const result = query.generate(
      Object.assign(
        {
          params: {
            id: 1,
            name: 'Abc',
          },
          ...options,
        },
        options,
      ),
    );
    expect(result.sql).toStrictEqual(
      'update table1 set id = :id, name = :name',
    );
    expect(result.params).toStrictEqual({
      id: 1,
      name: 'Abc',
    });
  });

  it('should serialize params with query.params', () => {
    const query = Update('table1', {
      id: Param('id'),
      name: Param('name'),
    }).values({
      id: 1,
      name: 'Abc',
    });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'update table1 set id = :id, name = :name',
    );
    expect(result.params).toStrictEqual({
      id: 1,
      name: 'Abc',
    });
  });

  it('should validate query.params', () => {
    expect(() =>
      Update('table1', { id: Param('id'), name: /name/ }).values([1, 'Abc']),
    ).toThrow('Invalid argument');
  });

  it('should serialize update with returning', () => {
    const query = Update('table1', { id: 1, name: 'aaa' }).returning(
      'id',
      'name as n',
    );
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      "update table1 set id = 1, name = 'aaa' returning id, name as n",
    );
  });
});
