import { expect } from 'expect';
import { Select } from '../../src/index.js';

describe('builder:serialize "TableName"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should serialize (table)', () => {
    const query = Select().from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table1');
  });

  it('should serialize (table alias)', () => {
    const query = Select().from('table1 t1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from table1 t1');
  });

  it('should serialize (schema.table)', () => {
    const query = Select().from('schema1.table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from schema1.table1');
  });

  it('should serialize (schema.table alias)', () => {
    const query = Select().from('schema1.table1 t1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select * from schema1.table1 t1');
  });

  it('should validate schema name', () => {
    expect(() => Select().from('1sch.table1')).toThrow(
      'does not match table name format',
    );
  });

  it('should validate table name', () => {
    expect(() => Select().from('sch.1table1')).toThrow(
      'does not match table name format',
    );
  });

  it('should validate alias', () => {
    expect(() => Select().from('sch.table1 c+')).toThrow(
      'does not match table name format',
    );
  });
});
