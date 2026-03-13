import { expect } from 'expect';
import { Select } from '../../src/index.js';
import { TableName } from '../../src/sql-objects/table-name.js';

describe('builder:serialize "TableName"', () => {
  const options = {
    dialect: 'test',
    prettyPrint: false,
  };

  it('should init with string', () => {
    let tableName = new TableName('table1');
    expect(tableName.table).toStrictEqual('table1');
    tableName = new TableName('table1 t');
    expect(tableName.table).toStrictEqual('table1');
    expect(tableName.alias).toStrictEqual('t');
    tableName = new TableName('sch.table1 t');
    expect(tableName.schema).toStrictEqual('sch');
    expect(tableName.table).toStrictEqual('table1');
    expect(tableName.alias).toStrictEqual('t');
  });

  it('should init with object', () => {
    const tableName = new TableName({
      table: 'table1',
      alias: 't1',
      schema: 'sch',
    });
    expect(tableName.schema).toStrictEqual('sch');
    expect(tableName.table).toStrictEqual('table1');
    expect(tableName.alias).toStrictEqual('t1');
  });

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
