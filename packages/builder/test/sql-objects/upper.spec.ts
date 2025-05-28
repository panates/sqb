import { Field, Select, SerializationType, Upper } from '../../src/index.js';

describe('serialize "Upper"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize Upper', () => {
    expect(Upper('A')._type).toStrictEqual(SerializationType.UPPER_STATEMENT);
  });

  it('should serialize values', () => {
    const query = Select(Upper('ABC')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select upper('ABC') from table1`);
  });

  it('should serialize Field names', () => {
    const query = Select(Upper(Field('a'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select upper(a) from table1`);
  });

  it('should serialize sub query', () => {
    const query = Select(Upper(Select().from('table2'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select upper((select * from table2)) from table1`,
    );
  });

  it('should serialize alias', () => {
    const query = Select(Upper(1).as('col1')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select upper(1) col1 from table1');
  });
});
