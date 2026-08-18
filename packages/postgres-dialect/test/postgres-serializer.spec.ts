import { SerializerRegistry, sql } from '@sqb/builder';
import { expect } from 'expect';
import { PostgresSerializer } from '../src/postgres-serializer.js';

describe('postgres-dialect:PostgresSerializer', () => {
  const postgresSerializer = new PostgresSerializer();
  before(() => SerializerRegistry.register(postgresSerializer));
  after(() => SerializerRegistry.unRegister(postgresSerializer));

  it('should replace "= null" to "is null": test1', () => {
    const query = sql.Select().from('table1').where({ ID: null });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "= null" to "is null": test2', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ ID: sql.Param('cid') });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "= null" to "is null": test3', () => {
    const query = sql.Select().from('table1').where(sql.Eq('ID', null));
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "!= null" to "is not null": test1', () => {
    const query = sql.Select().from('table1').where({ 'ID !=': null });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID is not null',
    );
  });

  it('should replace "!= null" to "is not null": test2', () => {
    const query = sql.Select().from('table1').where({ 'ID !=': null });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID is not null',
    );
  });

  it('should serialize reserved word', () => {
    const query = sql.Select('comment').from('table1');
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select "comment" from table1');
  });

  it('should serialize "limit"', () => {
    const query = sql.Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10');
  });

  it('should serialize "offset"', () => {
    const query = sql.Select().from('table1').offset(4);
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 OFFSET 4');
  });

  it('should serialize "limit" pretty print', () => {
    const query = sql.Select().from('table1').limit(10);
    const result = query.generate({
      dialect: 'postgres',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10');
  });

  it('should serialize "offset" pretty print', () => {
    const query = sql.Select().from('table1').offset(10);
    const result = query.generate({
      dialect: 'postgres',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nOFFSET 10');
  });

  it('should serialize "limit/offset"', () => {
    const query = sql.Select().from('table1').offset(4).limit(10);
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10 OFFSET 4');
  });

  it('should serialize "limit/offset" pretty print', () => {
    const query = sql.Select().from('table1').offset(4).limit(10);
    const result = query.generate({
      dialect: 'postgres',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10 OFFSET 4');
  });

  it('Should serialize params', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ ID: sql.Param('ID') });
    const result = query.generate({
      dialect: 'postgres',
      params: { ID: 5 },
    });
    expect(result.sql).toStrictEqual('select * from table1 where ID = $1');
    expect(result.params).toStrictEqual([5]);
  });

  it('Should change "= null" to "is null"', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ ID: sql.Raw('null') });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('Should change "!= null" to "is not null"', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ID !=': sql.Raw('null') });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID is not null',
    );
  });

  it('Should compare array params using "in" operator', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ID in': sql.Param('id') })
      .values({ id: [1, 2, 3] });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ID = ANY($1)');
    expect(result.params).toStrictEqual([[1, 2, 3]]);
  });

  it('Should compare array params using "nin" operator', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ID !in': sql.Param('id') })
      .values({ id: [1, 2, 3] });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID != ANY($1)',
    );
    expect(result.params).toStrictEqual([[1, 2, 3]]);
  });

  it('Should compare array value using "in" operator', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ID in': [1, 2, 3] });
    const result = query.generate({
      dialect: 'postgres',
      params: { ID: 5 },
    });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID in (1,2,3)',
    );
  });

  it('Should serialize array params for "not in" operator', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ID !in': sql.Param('id') })
      .values({ id: [1, 2, 3] });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID != ANY($1)',
    );
    expect(result.params).toStrictEqual([[1, 2, 3]]);
  });

  it('Should serialize "match" operator', () => {
    const query = sql
      .Select()
      .from('table1')
      .where(sql.Match('search', sql.Param('text')));
    const result = query.generate({
      dialect: 'postgres',
      params: { text: 'abc' },
    });
    expect(result.sql).toStrictEqual(
      "select * from table1 where search @@ plainto_tsquery('simple', $1)",
    );
  });

  it('Should serialize "match" operator with custom config', () => {
    const query = sql
      .Select()
      .from('table1')
      .where(sql.Match('search', sql.Param('text'), 'english'));
    const result = query.generate({
      dialect: 'postgres',
      params: { text: 'abc' },
    });
    expect(result.sql).toStrictEqual(
      "select * from table1 where search @@ plainto_tsquery('english', $1)",
    );
  });

  it('Should compare array using "not in" operator', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ID !in': [1, 2, 3] });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID not in (1,2,3)',
    );
  });

  it('Should serialize "ne" operator as !=', () => {
    const query = sql.Select().from('table1').where({ 'ID ne': 0 });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ID != 0');
  });

  it('Should compare if both expression and value is array', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ids[] in': sql.Param('ids') })
      .values({ ids: [1, 2, 3] });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('select * from table1 where ids && $1');
    expect(result.params).toStrictEqual([[1, 2, 3]]);
  });

  it('Should compare if expression is array and but value', () => {
    const query = sql
      .Select()
      .from('table1')
      .where({ 'ids[] in': sql.Param('id') })
      .values({ id: 1 });
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where $1 = ANY(ids)',
    );
    expect(result.params).toStrictEqual([1]);
  });

  it('Should serialize update returning query', () => {
    const query = sql.Update('table1', { id: 1 }).returning('id');
    const result = query.generate({ dialect: 'postgres' });
    expect(result.sql).toStrictEqual('update table1 set id = 1 returning id');
    expect(result.returningFields).toStrictEqual([
      { field: 'id', alias: undefined },
    ]);
  });
});
