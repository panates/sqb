import '@sqb/postgres-dialect';
import {
  getInsertSQLsForTestData,
  getTestData,
  testDataTables,
} from '@sqb/adapter-tests';
import { expect } from 'expect';

describe('adapter-tests:test data', () => {
  it('should read every test data table shipped with the package', () => {
    for (const name of testDataTables) {
      const table = getTestData(name);
      expect(table.name).toStrictEqual(name);
      expect(table.rows.length).toBeGreaterThan(0);
    }
  });

  it('should seed customers with ids 1 to 100, which the suite relies on', () => {
    const ids = getTestData('customers').rows.map(r => r.ID ?? r.id);
    expect(ids.length).toStrictEqual(100);
    expect(Math.min(...ids)).toStrictEqual(1);
    expect(Math.max(...ids)).toStrictEqual(100);
  });

  it('should build insert scripts for every table in dependency order', () => {
    const files = getInsertSQLsForTestData({
      dialect: 'postgres',
      schema: 'test_schema',
    });
    expect(files.map(f => f.table.name)).toStrictEqual([...testDataTables]);
    expect(files[0].scripts[0]).toMatch(/^insert into test_schema\.continents/);
  });

  it('should build insert scripts for the chosen tables only', () => {
    const files = getInsertSQLsForTestData({
      dialect: 'postgres',
      tables: ['customers', 'continents', 'countries'],
    });
    expect(files.map(f => f.table.name)).toStrictEqual([
      'continents',
      'countries',
      'customers',
    ]);
  });
});
