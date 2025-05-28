import {
  Field,
  Select,
  SerializationType,
  StringAGG,
} from '../../src/index.js';

describe('serialize "StringAGG"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize StringAGG', () => {
    expect(StringAGG('A')._type).toStrictEqual(
      SerializationType.STRINGAGG_STATEMENT,
    );
  });

  it('should serialize values', () => {
    const query = Select(StringAGG('ABC')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select string_agg(ABC,',') from table1`);
  });

  it('should serialize Field names', () => {
    const query = Select(StringAGG(Field('a'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select string_agg(a,',') from table1`);
  });

  it('should serialize sub query', () => {
    const query = Select(StringAGG(Select().from('table2'))).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select string_agg((select * from table2),',') from table1`,
    );
  });

  it('should serialize alias', () => {
    const query = Select(StringAGG(Field('a')).as('col1')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select string_agg(a,',') col1 from table1`,
    );
  });

  it('should serialize delimiter', () => {
    const query = Select(StringAGG(Field('a')).delimiter('&')).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select string_agg(a,'&') from table1`);
  });

  it('should serialize order by', () => {
    const query = Select(
      StringAGG(Field('a')).delimiter('&').orderBy('a', 'b'),
    ).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      `select string_agg(a,'&' order by a, b) from table1`,
    );
  });
});
