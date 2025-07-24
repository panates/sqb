import { expect } from 'expect';
import { Raw, Select, SerializationType } from '../../src/index.js';

describe('builder:serialize "Raw"', () => {
  const options = {
    prettyPrint: false,
  };

  it('should initialize Raw', () => {
    expect(Raw('')._type).toStrictEqual(SerializationType.RAW);
  });

  it('should serialize Raw', () => {
    const query = Select(Raw("'John''s Bike' f1")).from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual("select 'John''s Bike' f1 from table1");
  });
});
