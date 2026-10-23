import {
  Eq,
  In,
  Ne,
  NotIn,
  Param,
  Select,
  Sequence,
  SerializerRegistry,
  StringAgg,
  TableName,
  Update,
} from '@sqb/builder';
import { expect } from 'expect';
import { OracleSerializer } from '../src/oracle-serializer.js';

describe('oracle-dialect:OracleSerializer', () => {
  const oracleSerializer = new OracleSerializer();
  before(() => SerializerRegistry.register(oracleSerializer));
  after(() => SerializerRegistry.unRegister(oracleSerializer));

  describe('oracle-dialect:all versions', () => {
    it('should use dual when no table given', () => {
      const query = Select().from();
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual('select * from dual');
    });

    it('should serialize Oracle-specific reserved words', () => {
      const query = Select('level', 'rownum', 'sysdate').from('table1');
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        'select "level", "rownum", "sysdate" from table1',
      );
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
      const query = Select(Sequence('test', true));
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

    it('should serialize date-like string value with "to_date()" function', () => {
      const query = Select().from('table1').where(Eq('dt', '2017-01-01'));
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        "select * from table1 where dt = to_date('2017-01-01', 'yyyy-mm-dd')",
      );
    });

    it('should serialize ISO date-time string value with "to_timestamp_tz()" function', () => {
      const query = Select()
        .from('table1')
        .where(Eq('dt', '2017-01-01T10:30:15'));
      const result = query.generate({ dialect: 'oracle' });
      expect(result.sql).toStrictEqual(
        "select * from table1 where dt = to_timestamp_tz('2017-01-01T10:30:15','yyyy-mm-dd\"T\"hh24:mi:sstzh:tzm')",
      );
    });

    it('should serialize string-agg function to listagg', () => {
      const query = Select(StringAgg('abc')).from('table1');
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

    it('Should serialize array parameter with "in" operator', () => {
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
      expect(result.params).not.toBeDefined();
    });

    it('should inline an array parameter in an UPDATE query', () => {
      // Oracle rejects an array bound to a non-PL/SQL statement with
      // ORA-01484, so the list has to be inlined here just as it is in a
      // SELECT - it regressed to a bound parameter in 5.0.5.
      const query = Update('table1', { x: 1 }).where(In('ID', Param('ID')));
      const result = query.generate({
        dialect: 'oracle',
        strictParams: true,
        params: { ID: [1, 2, 3] },
      });
      expect(result.sql).toStrictEqual(
        'update table1 set x = :P$_1 where ID in (1,2,3)',
      );
      expect(result.params).toStrictEqual({ P$_1: 1 });
    });

    it('should rewrite an array-valued "=" to "in" in an UPDATE query', () => {
      const query = Update('table1', { x: 1 }).where(Eq('ID', Param('ID')));
      const result = query.generate({
        dialect: 'oracle',
        strictParams: true,
        params: { ID: [1, 2, 3] },
      });
      expect(result.sql).toStrictEqual(
        'update table1 set x = :P$_1 where ID in (1,2,3)',
      );
    });

    it('should rewrite an array-valued "!=" to "not in" in an UPDATE query', () => {
      const query = Update('table1', { x: 1 }).where(Ne('ID', Param('ID')));
      const result = query.generate({
        dialect: 'oracle',
        strictParams: true,
        params: { ID: [1, 2, 3] },
      });
      expect(result.sql).toStrictEqual(
        'update table1 set x = :P$_1 where ID not in (1,2,3)',
      );
    });

    it('should inline an array parameter of a "not in" operator in an UPDATE query', () => {
      const query = Update('table1', { x: 1 }).where(NotIn('ID', Param('ID')));
      const result = query.generate({
        dialect: 'oracle',
        strictParams: true,
        params: { ID: [1, 2, 3] },
      });
      expect(result.sql).toStrictEqual(
        'update table1 set x = :P$_1 where ID not in (1,2,3)',
      );
    });

    it('should rewrite an array literal turned into a strict param to "in"', () => {
      // Under strictParams the array never reaches the comparison as a Param,
      // so the rewrite has to look at the original right-hand operand too.
      const select = Select()
        .from('table1')
        .where(Eq('ID', [1, 2, 3]))
        .generate({ dialect: 'oracle', strictParams: true });
      expect(select.sql).toStrictEqual(
        'select * from table1 where ID in (1,2,3)',
      );

      const update = Update('table1', { x: 1 })
        .where(Eq('ID', [1, 2, 3]))
        .generate({ dialect: 'oracle', strictParams: true });
      expect(update.sql).toStrictEqual(
        'update table1 set x = :P$_1 where ID in (1,2,3)',
      );
    });

    it('should not remove an inlined array from the given params object', () => {
      // `ctx.params` is the caller's own object, so deleting the entry made a
      // second generate() with the same options serialize as "is null".
      const params = { ID: [1, 2, 3] };
      const options = { dialect: 'oracle', params };
      const query = Select()
        .from('table1')
        .where(Eq('ID', Param('ID')));
      expect(query.generate(options).sql).toStrictEqual(
        'select * from table1 where ID in (1,2,3)',
      );
      expect(query.generate(options).sql).toStrictEqual(
        'select * from table1 where ID in (1,2,3)',
      );
      expect(params).toStrictEqual({ ID: [1, 2, 3] });
    });

    it('should serialize index hint', () => {
      const query = Select().from(
        TableName({
          table: 'table1',
          alias: 't',
          optimizerHint: {
            hint: 'INDEX(:table IDX_ID)',
            dialect: ['oracle'],
          },
        }),
      );
      const result = query.generate({ dialect: 'oracle' });

      expect(result.sql).toStrictEqual(
        'select /*+ INDEX(t IDX_ID) */ * from table1 t',
      );
    });
  });

  describe('oracle-dialect:Oracle version < 12', () => {
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

  describe('oracle-dialect:Oracle version >= 12', () => {
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
