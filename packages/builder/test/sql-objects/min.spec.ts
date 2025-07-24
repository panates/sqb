import { expect } from 'expect';
import { Field, Min, Select, SerializationType } from '../../src/index.js';

describe('builder:serialize "Min"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize Min', () => {
    expect(Min('A')._type).toStrictEqual(SerializationType.MIN_STATEMENT);
  });

  it('should serialize values', () => {
    const query = Select(Min('ABC')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select min('ABC') from table1`);
  });

  it('should serialize Field names', () => {
    const query = Select(Min(Field('a'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select min(a) from table1`);
  });

  it('should serialize sub query', () => {
    const query = Select(Min(Select().from('table2'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select min((select * from table2)) from table1`,
    );
  });

  it('should serialize alias', () => {
    const query = Select(Min(1).as('col1')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select min(1) col1 from table1');
  });
});
