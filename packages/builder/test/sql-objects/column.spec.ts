import { expect } from 'expect';
import { DataType, Field, Select } from '../../src/index.js';

describe('builder:serialize "TableField"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should initialize from string', () => {
    const query = Select('field1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select field1 from table1');
  });

  it('should initialize from constructor', () => {
    const query = Select(Field('t.field1 f1', DataType.VARCHAR, false)).from(
      'table1',
    );
    expect(query._columns?.[0]).toBeDefined();
    expect((query._columns?.[0] as any)._field).toStrictEqual('field1');
    expect((query._columns?.[0] as any)._table).toStrictEqual('t');
    expect((query._columns?.[0] as any)._alias).toStrictEqual('f1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select t.field1 as f1 from table1');
  });

  it('should serialize (field alias)', () => {
    const query = Select('field1 f1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select field1 as f1 from table1');
  });

  it('should serialize (table.field)', () => {
    const query = Select('table1.field1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select table1.field1 from table1');
  });

  it('should serialize (table.field alias)', () => {
    const query = Select('table1.field1 f1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select table1.field1 as f1 from table1');
  });

  it('should serialize (schema.table.field)', () => {
    const query = Select('schema1.table1.field1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select schema1.table1.field1 from table1',
    );
  });

  it('should serialize (schema.table.field alias)', () => {
    const query = Select('schema1.table1.field1 f1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select schema1.table1.field1 as f1 from table1',
    );
  });

  it('should table and column start with "_" character', () => {
    const query = Select('_table1._field1 _f1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select _table1._field1 as _f1 from table1',
    );
  });

  it('should "$" character can be used for table and column names', () => {
    const query = Select('table1$.field1$ f1$').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual(
      'select table1$.field1$ as f1$ from table1',
    );
  });

  it('should not table name start with "$" character', () => {
    expect(() => Select('$table1.field1 f1').from('table1')).toThrow(
      'does not match table column format',
    );
  });

  it('should not column name start with "$" character', () => {
    expect(() => Select('table1.$field1 f1').from('table1')).toThrow(
      'does not match table column format',
    );
  });

  it('should not alias name start with "$" character', () => {
    expect(() => Select('table1.field1 $f1').from('table1')).toThrow(
      'does not match table column format',
    );
  });

  it('should not print alias if field is *', () => {
    const query = Select('schema1.table1.* f1').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select schema1.table1.* from table1');
  });

  it('should place into double quote if field name is reserved', () => {
    const query = Select('with').from('table1');
    const result = query.generate(options);
    expect(result.sql).toStrictEqual('select "with" from table1');
  });

  it('should validate schema name', () => {
    expect(() => Select('a+.table1.field1 f1').from('table1')).toThrow(
      'does not match table column format',
    );
  });

  it('should validate table name', () => {
    expect(() => Select('a+.field1 f1').from('table1')).toThrow(
      'does not match table column format',
    );
  });

  it('should validate field name', () => {
    expect(() => Select('a+ f1').from('table1')).toThrow(
      'does not match table column format',
    );
  });

  it('should validate alias', () => {
    expect(() => Select('field1 a+').from('table1')).toThrow(
      'does not match table column format',
    );
  });
});
