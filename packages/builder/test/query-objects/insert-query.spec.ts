import {
  Insert,
  Param,
  Raw,
  Select,
  SerializationType,
} from '../../src/index.js';

describe('Serialize insert query', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize InsertQuery', () => {
    const q = Insert('table1', { id: 1 });
    expect(q && q._type).toStrictEqual(SerializationType.INSERT_QUERY);
  });

  it('should serialize insert', () => {
    const query = Insert('table1', { id: 1, name: 'aaa' });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      "insert into table1 (id, name) values (1, 'aaa')",
    );
  });

  it('should serialize insert.into', () => {
    const query = Insert('table1', { id: 1, name: 'aaa' });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      "insert into table1 (id, name) values (1, 'aaa')",
    );
  });

  it('should pass raw as table name', () => {
    const query = Insert(Raw('table1'), { id: 1, name: 'aaa' });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      "insert into table1 (id, name) values (1, 'aaa')",
    );
  });

  it('should validate first (tableName) argument', () => {
    expect(
      // @ts-ignore
      () => Insert(null, { id: 1, name: 'aaa' }),
    ).toThrow('as first argument');
  });

  it('should validate second (values) argument', () => {
    expect(() => Insert('table1', [1, 'aaa'])).toThrow('as second argument');
    expect(() => Insert('table1', 'sdfds')).toThrow('as second argument');
  });

  it('should serialize params with "values" argument', () => {
    const query = Insert('table1', { id: Param('id'), name: Param('name') });
    const result = query.generate(
      Object.assign(
        {
          params: {
            id: 1,
            name: 'Abc',
          },
        },
        options,
      ),
    );
    expect(result.sql).toStrictEqual(
      'insert into table1 (id, name) values (:id, :name)',
    );
    expect(result.params).toStrictEqual({
      id: 1,
      name: 'Abc',
    });
  });

  it('should serialize params with query.params', () => {
    const query = Insert('table1', {
      id: Param('id'),
      name: Param('name'),
    }).values({
      id: 1,
      name: 'Abc',
    });
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'insert into table1 (id, name) values (:id, :name)',
    );
    expect(result.params).toStrictEqual({
      id: 1,
      name: 'Abc',
    });
  });

  it('should validate query.params', () => {
    expect(() =>
      Insert('table1', { id: /id/, name: /name/ }).values([1, 'Abc']),
    ).toThrow('Invalid argument');
  });

  it('should serialize insert/select query', () => {
    const query = Insert(
      'table1',
      Select('id', 'the_name name').from('table2'),
    );
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'insert into table1 (id, name) values (select id, the_name as name from table2)',
    );
  });

  it('should serialize insert with returning', () => {
    const query = Insert('table1', { id: 1, name: 'aaa' }).returning(
      'id',
      'update as u1',
    );
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `insert into table1 (id, name) values (1, 'aaa') returning id, "update" as u1`,
    );
    expect(result.returningFields).toStrictEqual([
      { field: 'id', alias: undefined },
      { field: 'update', alias: 'u1' },
    ]);
  });

  it('should validate returning() arguments', () => {
    expect(() =>
      Insert('table1', { id: 1, name: 'aaa' })
        // @ts-ignore
        .returning(null),
    ).not.toThrow();
    expect(() =>
      Insert('table1', { id: 1, name: 'aaa' })
        // @ts-ignore
        .returning('123'),
    ).toThrow('does not match');
  });
});
