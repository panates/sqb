import { Param, Select, SerializerRegistry } from '@sqb/builder';
import { MSSqlSerializer } from '../src/ms-sql-serializer.js';

describe('MSSqlSerializer', () => {
  const mssqlSerializer = new MSSqlSerializer();
  beforeAll(() => SerializerRegistry.register(mssqlSerializer));
  afterAll(() => SerializerRegistry.unRegister(mssqlSerializer));

  it('should serialize "limit"', () => {
    const query = Select().from('table1').as('t1').limit(10);
    const result = query.generate({ dialect: 'mssql' });
    expect(result.sql).toStrictEqual(
      'select * from table1 FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should serialize "limit" pretty print', () => {
    const query = Select().from('table1').as('t1').limit(10);
    const result = query.generate({ dialect: 'mssql', prettyPrint: true });
    expect(result.sql).toStrictEqual(
      'select * from table1\nFETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should serialize "limit/offset"', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({
      dialect: 'mssql',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual(
      'select * from table1\nOFFSET 4 ROWS FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('should serialize "limit/offset" pretty print', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({
      dialect: 'mssql',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual(
      'select * from table1\nOFFSET 4 ROWS FETCH NEXT 10 ROWS ONLY',
    );
  });

  it('Should serialize params', () => {
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
});
