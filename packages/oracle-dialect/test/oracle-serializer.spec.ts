import {
  Eq,
  Param,
  Select,
  SequenceNext,
  SerializerRegistry,
  StringAGG,
} from '@sqb/builder';
import { OracleSerializer } from '../src/oracle-serializer.js';

describe('OracleSerializer', () => {
  const oracleSerializer = new OracleSerializer();
  beforeAll(() => SerializerRegistry.register(oracleSerializer));
  afterAll(() => SerializerRegistry.unRegister(oracleSerializer));

  describe('all versions', () => {
    it('should use dual when no table given', () => {
      const query = Select().from();
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual('select * from dual');
    });

    it('should replace "= null" to "is null": test1', () => {
      const query = Select().from().where({ ID: null });
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual('select * from dual where ID is null');
    });

    it('should replace "= null" to "is null": test2', () => {
      const query = Select()
        .from()
        .where({ ID: Param('cid') });
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual('select * from dual where ID is null');
    });

    it('should replace "= null" to "is null": test3', () => {
      const query = Select().from().where(Eq('ID', null));
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual('select * from dual where ID is null');
    });

    it('should replace "!= null" to "is not null": test1', () => {
      const query = Select().from().where({ 'ID !=': null });
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select * from dual where ID is not null',
      );
    });

    it('should replace "!= null" to "is not null": test2', () => {
      const query = Select().from().where({ 'ID !=': null });
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select * from dual where ID is not null',
      );
    });

    it('should serialize GenId"', () => {
      const query = Select(SequenceNext('test'));
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual('select test.nextval from dual');
    });

    it('should serialize date-time with "to_date()" function', () => {
      const query = Select()
        .from('table1')
        .where(Eq('dt', new Date(Date.UTC(2017, 0, 1, 10, 30, 15))));
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        "select * from table1 where dt = to_date('2017-01-01 10:30:15', 'yyyy-mm-dd hh24:mi:ss')",
      );
    });

    it('should serialize date with "to_date()" function', () => {
      const query = Select()
        .from('table1')
        .where(Eq('dt', new Date(Date.UTC(2017, 0, 1, 0, 0, 0))));
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        "select * from table1 where dt = to_date('2017-01-01', 'yyyy-mm-dd')",
      );
    });

    it('should serialize string-agg function to listagg', () => {
      const query = Select(StringAGG('abc')).from('table1');
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        `select listagg(abc,',') within group (order by null) from table1`,
      );
    });

    it('Should serialize params', () => {
      const query = Select()
        .from('table1')
        .where(Eq('ID', Param('ID')));
      const result = query.generate({
        dialect: 'oracle',
        params: { ID: 5 },
      });
      expect(result.sql).toStrictEqual('select * from table1 where ID = :ID');
      expect(result.params).toStrictEqual({ ID: 5 });
    });

    it('Should serialize array parameter in "in" operator', () => {
      const query = Select()
        .from('table1')
        .where(Eq('ID', Param('ID')));
      const result = query.generate({
        dialect: 'oracle',
        params: { ID: [1, 2, 3] },
      });
      expect(result.sql).toStrictEqual(
        'select * from table1 where ID in (1,2,3)',
      );
      expect(result.params).toStrictEqual({});
    });
  });

  describe('Oracle version < 12', () => {
    it('should serialize "limit"', () => {
      const query = Select().from('table1').limit(10);
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select * from (select * from table1) where rownum <= 10',
      );
    });

    it('should serialize "limit" pretty print', () => {
      const query = Select().from('table1').limit(10);
      const result = query.generate({
        dialect: 'oracle',
        prettyPrint: true,
      });
      expect(result.sql).toStrictEqual(
        'select * from (\n  select * from table1\n) where rownum <= 10',
      );
    });

    it('should serialize "offset"', () => {
      const query = Select().from('table1').offset(4);
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select * from (select /*+ first_rows(100) */ t.*, rownum row$number from (select * from table1) t) where row$number >= 5',
      );
    });

    it('should serialize "limit/offset"', () => {
      const query = Select().from('table1').offset(4).limit(10);
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select * from (select /*+ first_rows(10) */ t.*, rownum row$number ' +
          'from (select * from table1) t where rownum <= 14) where row$number >= 5',
      );
    });

    it('should serialize "limit/offset" pretty print', () => {
      const query = Select().from('table1').offset(4).limit(10);
      const result = query.generate({
        dialect: 'oracle',
        prettyPrint: true,
      });
      expect(result.sql).toStrictEqual(
        'select * from (\n' +
          '  select /*+ first_rows(10) */ t.*, rownum row$number from (\n' +
          '    select * from table1\n' +
          '  ) t where rownum <= 14\n' +
          ') where row$number >= 5',
      );
    });

    it('should serialize "limit" ordered', () => {
      const query = Select().from('table1').orderBy('id').limit(10);
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select * from (select /*+ first_rows(10) */ t.*, rownum row$number ' +
          'from (select * from table1 order by id) t where rownum <= 10)',
      );
    });

    it('should serialize "limit" ordered pretty print', () => {
      const query = Select().from('table1').orderBy('id').offset(21).limit(10);
      const result = query.generate({
        dialect: 'oracle',
        prettyPrint: true,
      });
      expect(result.sql).toStrictEqual(
        'select * from (\n' +
          '  select /*+ first_rows(10) */ t.*, rownum row$number from (\n' +
          '    select * from table1\n' +
          '    order by id\n' +
          '  ) t where rownum <= 31\n' +
          ') where row$number >= 22',
      );
    });
  });

  describe('Oracle version >= 12', () => {
    it('should serialize "limit"', () => {
      const query = Select().from('table1').limit(10);
      const result = query.generate({
        dialect: 'oracle',
        dialectVersion: '12',
      });
      expect(result.sql).toStrictEqual(
        'select * from table1 FETCH FIRST 10 ROWS ONLY',
      );
    });

    it('should serialize "limit" pretty print', () => {
      const query = Select().from('table1').limit(10);
      const result = query.generate({
        dialect: 'oracle',
        dialectVersion: '12',
        prettyPrint: true,
      });
      expect(result.sql).toStrictEqual(
        'select * from table1\nFETCH FIRST 10 ROWS ONLY',
      );
    });

    it('should serialize "offset"', () => {
      const query = Select().from('table1').offset(4);
      const result = query.generate({
        dialect: 'oracle',
        dialectVersion: '12',
      });
      expect(result.sql).toStrictEqual('select * from table1 OFFSET 4 ROWS');
    });

    it('should serialize "limit/offset"', () => {
      const query = Select().from('table1').offset(4).limit(10);
      const result = query.generate({
        dialect: 'oracle',
        dialectVersion: '12',
      });
      expect(result.sql).toStrictEqual(
        'select * from table1 OFFSET 4 ROWS FETCH NEXT 10 ROWS ONLY',
      );
    });

    it('should serialize "limit/offset" pretty print', () => {
      const query = Select().from('table1').offset(4).limit(10);
      const result = query.generate({
        dialect: 'oracle',
        dialectVersion: '12',
        prettyPrint: true,
      });
      expect(result.sql).toStrictEqual(
        'select * from table1\nOFFSET 4 ROWS FETCH NEXT 10 ROWS ONLY',
      );
    });
  });
});
