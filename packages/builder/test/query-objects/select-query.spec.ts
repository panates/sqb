import { expect } from 'expect';
import {
  Eq,
  Param,
  Raw,
  Select,
  SerializationType,
  SerializerRegistry,
} from '../../src/index.js';
import { TestSerializer } from '../_support/test_serializer.js';

describe('builder:serialize "SelectQuery"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  const testSerializer = new TestSerializer();

  before(() => SerializerRegistry.register(testSerializer));
  after(() => SerializerRegistry.unRegister(testSerializer));

  it('should initialize SelectQuery', () => {
    const q = Select();
    expect(q._type).toStrictEqual(SerializationType.SELECT_QUERY);
  });

  it('should serialize * for when no columns given', () => {
    const query = Select('*').addColumn().from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table1');
  });

  it('should serialize when no tables given', () => {
    const query = Select();
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select *');
  });

  it('should serialize simple query', () => {
    const query = Select(
      'field1',
      'field2',
      'field3',
      'field4',
      'field5',
      'field6',
      'field7',
      'field8',
      'field9',
      'field10',
      'field11',
      'field12',
      'field13',
      'field14',
      'field15',
      'field16',
    ).from('table1');
    const result = query.generate({
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual(
      'select\n' +
        '  field1, field2, field3, field4, field5, field6, field7, field8,\n' +
        '  field9, field10, field11, field12, field13, field14, field15,\n' +
        '  field16\n' +
        'from table1',
    );
  });

  it('should pass array as columns', () => {
    const query = Select(
      ['field1', 'field2'],
      'field3',
      'field4',
      ['field5', 'field6', 'field7', 'field8', 'field9'],
      'field10',
    ).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select field1, field2, field3, field4, field5, field6, field7, field8, field9, field10 from table1',
    );
  });

  it('should skip empty columns, tables, joins, group columns and order columns', () => {
    const query = Select('field1', '')
      .from('schema1.table1 t1', '')
      // @ts-ignore
      .join(null)
      .groupBy('')
      .orderBy('');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select field1 from schema1.table1 t1');
  });

  it('should serialize raw in columns', () => {
    const query = Select(Raw("'John''s Bike' f1")).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual("select 'John''s Bike' f1 from table1");
  });

  it('should serialize sub-select in columns', () => {
    const sub = Select('id').from('table2').as('id2');
    const query = Select(sub).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select (select id from table2) id2 from table1',
    );
  });

  it('should serialize raw in "from" part', () => {
    const query = Select().from('table1', Raw('func1()'));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table1,func1()');
  });

  it('should serialize sub-select in "from"', () => {
    const query = Select().from(
      Select(
        'field1',
        'field2',
        'field3',
        'field4',
        'field5',
        'field6',
        'field7',
        'field8',
      )
        .from('table1')
        .as('t1'),
    );
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select * from (select field1, field2, field3, field4, field5, field6, field7, field8 from table1) t1',
    );
  });

  it('should serialize raw in "order by"', () => {
    const query = Select().from('table1').orderBy(Raw('field1'));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table1 order by field1');
  });

  it('should pretty print - test1', () => {
    const query = Select().from(
      Select(
        'field1',
        'field2',
        'field3',
        'field4',
        'field5',
        'field6',
        'field7',
        'field8',
      )
        .from('table1')
        .as('t1'),
    );
    const result = query.generate({ prettyPrint: true });
    expect(result.sql).toStrictEqual(
      'select * from\n' +
        '  (select field1, field2, field3, field4, field5, field6, field7, field8\n' +
        '  from table1) t1',
    );
  });

  it('should serialize params', () => {
    const query = Select()
      .from('table1')
      .where({ id: Param('id') });
    const result = query.generate({ ...options, params: { id: 1 } });
    expect(result.sql).toStrictEqual('select * from table1 where id = __id');
    expect(result.params.id).toStrictEqual(1);
  });

  it('should force using params if strictParams=true', () => {
    const query = Select().from('table1').where({ id: 1 });
    const result = query.generate({ ...options, strictParams: true });
    expect(result.sql).toStrictEqual('select * from table1 where id = __P$_1');
    expect(result.params.P$_1).toStrictEqual(1);
  });

  it('should serialize distinct query', () => {
    const query = Select('id', 'name').distinct().from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select distinct id, name from table1');
  });

  it('should pretty print - test2', () => {
    const query = Select()
      .from('table1')
      .where(
        Eq('ID', 1),
        Eq('name', 'value of the field should be too long'),
        Eq('ID', 1),
        Eq('ID', 12345678),
      )
      .groupBy('field1', 'field2', Raw('field3'));
    const result = query.generate({ prettyPrint: true });
    expect(result.sql).toStrictEqual(
      'select * from table1\n' +
        "where ID = 1 and name = 'value of the field should be too long' and\n" +
        '  ID = 1 and ID = 12345678\n' +
        'group by field1, field2, field3',
    );
  });

  it('should assign limit ', () => {
    const query = Select().from('table1').limit(5);
    expect(query._limit).toStrictEqual(5);
  });

  it('should assign offset ', () => {
    const query = Select().from('table1').offset(5);
    expect(query._offset).toStrictEqual(5);
  });

  it('should pass only Join instance to join() function', () => {
    expect(() =>
      // @ts-ignore
      Select().from('table1').join('dfd'),
    ).toThrow('Join statement required');
  });

  it('should validate alias for sub-select in columns', () => {
    expect(() => {
      const query = Select(Select().from('table2')).from('table1 t1');
      query.generate();
    }).toThrow('Alias required for sub-select in columns');
  });

  it('should validate alias for sub-select in "from"', () => {
    expect(() => {
      const query = Select().from(Select().from('table2'));
      query.generate();
    }).toThrow('Alias required for sub-select in "from"');
  });
});
