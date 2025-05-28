import { Field, Max, Select, SerializationType } from '../../src/index.js';

describe('serialize "Max"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize Max', () => {
    expect(Max('A')._type).toStrictEqual(SerializationType.MAX_STATEMENT);
  });

  it('should serialize values', () => {
    const query = Select(Max('ABC')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select max('ABC') from table1`);
  });

  it('should serialize Field names', () => {
    const query = Select(Max(Field('a'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select max(a) from table1`);
  });

  it('should serialize sub query', () => {
    const query = Select(Max(Select().from('table2'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select max((select * from table2)) from table1`,
    );
  });

  it('should serialize alias', () => {
    const query = Select(Max(1).as('col1')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select max(1) col1 from table1');
  });
});
