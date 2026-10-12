import { Match, Param, Select, SerializerRegistry } from '@sqb/builder';
import { expect } from 'expect';
import { toFtsQuery } from '../src/fts.js';
import { SqliteSerializer } from '../src/sqlite-serializer.js';

describe('sqlite-dialect:SqliteSerializer', () => {
  const postgresSerializer = new SqliteSerializer();
  before(() => SerializerRegistry.register(postgresSerializer));
  after(() => SerializerRegistry.unRegister(postgresSerializer));

  it('should serialize SQLite-specific reserved words', () => {
    const query = Select('glob', 'pragma', 'vacuum').from('table1');
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual(
      'select "glob", "pragma", "vacuum" from table1',
    );
  });

  it('should serialize "limit"', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10');
  });

  it('should serialize "offset"', () => {
    const query = Select().from('table1').offset(4);
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual('select * from table1 OFFSET 4');
  });

  it('should serialize "limit" pretty print', () => {
    const query = Select().from('table1').limit(10);
    const result = query.generate({
      dialect: 'sqlite',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10');
  });

  it('should serialize "offset" pretty print', () => {
    const query = Select().from('table1').offset(10);
    const result = query.generate({
      dialect: 'sqlite',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nOFFSET 10');
  });

  it('should serialize "limit/offset"', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({ dialect: 'sqlite' });
    expect(result.sql).toStrictEqual('select * from table1 LIMIT 10 OFFSET 4');
  });

  it('should serialize "limit/offset" pretty print', () => {
    const query = Select().from('table1').offset(4).limit(10);
    const result = query.generate({
      dialect: 'sqlite',
      prettyPrint: true,
    });
    expect(result.sql).toStrictEqual('select * from table1\nLIMIT 10 OFFSET 4');
  });

  it('Should serialize params', () => {
    const query = Select()
      .from('table1')
      .where({ ID: Param('ID') });
    const result = query.generate({
      dialect: 'sqlite',
      params: { ID: 5 },
    });
    expect(result.sql).toStrictEqual('select * from table1 where ID = :ID');
    expect(result.params).toStrictEqual({ ID: 5 });
  });

  describe('"match"', () => {
    it('should search an FTS5 table', () => {
      const query = Select()
        .from('logs_fts')
        .where(Match('message', Param('text')));
      const result = query.generate({
        dialect: 'sqlite',
        params: { text: 'refused' },
      });
      expect(result.sql).toStrictEqual(
        'select * from logs_fts where message MATCH :text',
      );
      expect(result.params).toStrictEqual({ text: 'refused' });
    });

    it('should search a table through its FTS5 index', () => {
      const query = Select()
        .from('logs')
        .where(Match('message', Param('text'), 'logs_fts'));
      const result = query.generate({
        dialect: 'sqlite',
        params: { text: 'refused' },
      });
      expect(result.sql).toStrictEqual(
        'select * from logs where rowid IN (SELECT rowid FROM logs_fts WHERE message MATCH :text)',
      );
    });

    it('should compare the FTS5 rowids with the key given', () => {
      const query = Select()
        .from('logs l')
        .where(
          Match('l.message', Param('text'), { table: 'logs_fts', key: 'l.id' }),
        );
      const result = query.generate({
        dialect: 'sqlite',
        params: { text: 'refused' },
      });
      expect(result.sql).toStrictEqual(
        'select * from logs l where l.id IN (SELECT rowid FROM logs_fts WHERE message MATCH :text)',
      );
    });
  });

  describe('toFtsQuery', () => {
    it('should quote each word, so FTS5 syntax is searched for', () => {
      expect(toFtsQuery('ORU^R01  refused')).toStrictEqual(
        '"ORU^R01" "refused"',
      );
      expect(toFtsQuery('say "hi" -x')).toStrictEqual('"say" """hi""" "-x"');
      expect(toFtsQuery('  ')).toStrictEqual('');
    });
  });
});
