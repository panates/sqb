import { expect } from 'expect';
import { Count, Select, SerializationType } from '../../src/index.js';

describe('builder:serialize "Count"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize Count', () => {
    expect(Count()._type).toStrictEqual(SerializationType.COUNT_STATEMENT);
  });

  it('should serialize', () => {
    const query = Select(Count()).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select count(*) from table1');
  });
});
