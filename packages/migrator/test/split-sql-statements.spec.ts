import assert from 'assert';
import { splitSqlStatements } from '../src/utils/split-sql-statements.js';

describe('migrator:splitSqlStatements', () => {
  it('should split on ";" outside literals, identifiers and comments', () => {
    assert.deepStrictEqual(
      splitSqlStatements(
        "create table t (a int); -- x; y\n insert into t values (';');" +
          ' /* a; b */ select "x;y" from t',
      ),
      [
        'create table t (a int)',
        "insert into t values ('')",
        'select "" from t',
      ],
    );
  });

  it('should blank out dollar-quoted bodies and nested comments when asked', () => {
    assert.deepStrictEqual(
      splitSqlStatements(
        'do $body$ begin; vacuum; end $body$; /* a /* b */ c; */ select 1',
        { dollarQuotes: true, nestedComments: true },
      ),
      ["do ''", 'select 1'],
    );
    // Not a dollar quote: a positional parameter
    assert.deepStrictEqual(
      splitSqlStatements('select $1; select 2', { dollarQuotes: true }),
      ['select $1', 'select 2'],
    );
  });

  it('should run in linear time on adversarial input', () => {
    for (const input of [
      '/*' + 'a/*'.repeat(50000),
      '$' + '$'.repeat(100000),
      "'" + "''".repeat(50000),
      '-'.repeat(100000),
    ]) {
      const t = Date.now();
      splitSqlStatements(input, { dollarQuotes: true, nestedComments: true });
      assert.ok(Date.now() - t < 500, `too slow on ${input.substring(0, 10)}`);
    }
  });
});
