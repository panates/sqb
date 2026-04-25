import { expect } from 'expect';
import { Select, Sequence, SerializationType } from '../../src/index.js';

describe('builder:serialize "Sequence Getter"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize genID', () => {
    expect(Sequence('A')._type).toStrictEqual(
      SerializationType.SEQUENCE_GETTER_STATEMENT,
    );
  });

  it('should serialize nextval', () => {
    const query = Select(Sequence('ABC', true));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select nextval('ABC')`);
  });

  it('should serialize currval', () => {
    const query = Select(Sequence('ABC'));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select currval('ABC')`);
  });

  it('should serialize alias', () => {
    const query = Select(Sequence('test', true).as('col1'));
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(`select nextval('test') col1`);
  });
});
