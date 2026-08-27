import { Eq, Insert, Param, Select, SerializerRegistry } from '@sqb/builder';
import { expect } from 'expect';
import { MSSqlSerializer } from '../src/ms-sql-serializer.js';

describe('mssql-dialect:MSSqlSerializer', () => {
  const mssqlSerializer = new MSSqlSerializer();
  before(() => SerializerRegistry.register(mssqlSerializer));
  after(() => SerializerRegistry.unRegister(mssqlSerializer));

  it('should replace "= null" to "is null"', () => {
    const query = Select().from('table1').where({ ID: null });
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual('select * from table1 where ID is null');
  });

  it('should replace "!= null" to "is not null"', () => {
    const query = Select().from('table1').where({ 'ID !=': null });
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID is not null',
    );
  });

  it('should serialize MSSQL-specific reserved words', () => {
    const query = Select('top', 'cursor', 'identity').from('table1');
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual(
      'select "top", "cursor", "identity" from table1',
    );
  });

  it('should serialize "limit" (requires OFFSET and an ORDER BY in T-SQL)', () => {
    const query = Select().from('table1').as('t1').limit(10);
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should serialize "limit" pretty print', () => {
    const query = Select().from('table1').as('t1').limit(10);
    const result = query.generate({ dialect: 'mssql', prettyPrint: true });
    expect(result.sql).toStrictEqual(
      'select * from table1\nORDER BY (SELECT NULL)\nOFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should serialize "limit/offset"', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 ORDER BY (SELECT NULL) OFFSET 4 ROWS FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should not add ORDER BY (SELECT NULL) when an ORDER BY is already present', () => {
    const query = Select().from('table1').orderBy('id').limit(10);
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 order by id OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should serialize params', () => {
    const query = Select()
      .from('table1')
      .where({ ID: Param('ID') });
    const result = query.generate({
      dialect: 'mssql',
      params: { ID: 5 },
    });
    expect(result.sql).toStrictEqual('select * from table1 where ID = @ID');
    expect(result.params).toStrictEqual({ ID: 5 });
  });

  it('should serialize array parameter with "in" operator', () => {
    const query = Select()
      .from('table1')
      .where(Eq('ID', Param('ID')));
    const result = query.generate({
      dialect: 'mssql',
      params: { ID: [1, 2, 3] },
    });
    expect(result.sql).toStrictEqual(
      'select * from table1 where ID in (1,2,3)',
    );
    expect(result.params).not.toBeDefined();
  });

  it('should serialize boolean values as 1/0', () => {
    const query = Select().from('table1').where({ active: true });
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual('select * from table1 where active = 1');
  });

  it('should strip the RETURNING clause (OUTPUT is injected by the connection)', () => {
    const query = Insert('table1', { name: 'a' }).returning('id');
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).not.toMatch(/returning/i);
  });
});
