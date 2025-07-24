import { expect } from 'expect';
import { Field, Lower, Select, SerializationType } from '../../src/index.js';

describe('builder:serialize "Lower"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize Lower', () => {
    expect(Lower('A')._type).toStrictEqual(SerializationType.LOWER_STATEMENT);
  });

  it('should serialize values', () => {
    const query = Select(Lower('ABC')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select lower('ABC') from table1`);
  });

  it('should serialize Field names', () => {
    const query = Select(Lower(Field('a'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select lower(a) from table1`);
  });

  it('should serialize sub query', () => {
    const query = Select(Lower(Select().from('table2'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select lower((select * from table2)) from table1`,
    );
  });

  it('should serialize alias', () => {
    const query = Select(Lower(1).as('col1')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select lower(1) col1 from table1');
  });
});
