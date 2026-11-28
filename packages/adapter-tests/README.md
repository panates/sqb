<p align="center">
  <img src="https://sqb.panates.com/img/github-hero.webp" width="1280" alt="SQB" />
</p>

# @sqb/adapter-tests

Conformance test suite and test data for SQB database adapters.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![CI Tests][ci-test-image]][ci-test-url]
[![Test Coverage][coveralls-image]][coveralls-url]

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/adapter-tests

Every SQB adapter in this repository ([`@sqb/postgres`](../postgres), [`@sqb/mysql`](../mysql),
[`@sqb/mariadb`](../mariadb), [`@sqb/mssql`](../mssql), [`@sqb/oracle`](../oracle),
[`@sqb/sqlite`](../sqlite), [`@sqb/sqljs`](../sqljs)) runs this same suite. If you write an adapter
of your own, run it too: an adapter that passes it behaves the way `@sqb/connect` expects.

The suite covers connecting, the working schema, selects with array and object rows, cursors,
`fetchRows`, `fetchAsString`, inserts and updates with `returning`, named parameters in raw SQL,
and transactions (commit, rollback, `autoCommit`). Tests for an optional feature run only when the
adapter declares it in `adapter.features`.

## Installation

```bash
npm install --save-dev @sqb/adapter-tests mocha
```

The suite registers its tests with [mocha](https://mochajs.org), so the spec file must run under
mocha.

## Usage

```ts
import { initAdapterTests } from '@sqb/adapter-tests';
import { MyAdapter } from '../src/my-adapter.js';
import { createTestSchema } from './create-test-schema.js';

describe('MyAdapter', () => {
  const adapter = new MyAdapter();

  before(() => createTestSchema('test_sqb'));

  initAdapterTests(adapter, {
    host: 'localhost',
    database: 'test',
    user: 'test',
    password: 'test',
    schema: 'test_sqb',
  });
});
```

`initAdapterTests(adapter, config)` registers the adapter, connects with `config` (`driver` and
`pool` are set by the suite) and unregisters the adapter when the suite is done.

## The test database

The suite does not create tables: the database it connects to must already hold the test schema
with the test data loaded. Tables are created in your database's own SQL; the data is loaded with
the helpers below.

The suite itself reads and writes `customers`, and needs at least these columns:

| Column        | Type                                        |
| ------------- | ------------------------------------------- |
| `id`          | integer primary key, generated on insert    |
| `given_name`  | text                                        |
| `family_name` | text                                        |
| `city`        | text                                        |
| `birth_date`  | date                                        |
| `created_at`  | timestamp, defaulting to the current time   |

The test data has customers with ids 1 to 100; the suite relies on that. Some tests insert and
update customers, so give the suite a schema or database of its own.

The complete schema every adapter here creates (continents, countries, customers and their
details, tags, and a parent/child/grandchild chain) is in each adapter's `test/_support` folder.
The SQLite one, [`db_schema.ts`](../sqlite/test/_support/db_schema.ts), is the shortest to start
from.

### Loading the test data

```ts
import { getInsertSQLsForTestData } from '@sqb/adapter-tests';

const files = getInsertSQLsForTestData({ dialect: 'postgres', schema: 'test_sqb' });
for (const file of files) {
  for (const sql of file.scripts) await connection.execute(sql);
}
```

`getInsertSQLsForTestData()` returns one entry per table, in an order where every foreign key finds
its parent row. It generates the SQL with `@sqb/builder`, so the dialect's serializer must be
registered (an SQB adapter registers its own when imported). Pass `tables` to load only some of the
tables, for example `['continents', 'countries', 'customers']` for the suite alone.

Other exports:

- `testDataTables`: the table names, in insert order.
- `getTestData(table)`: one table's name, field descriptions and rows, as shipped with the package.
- `stringifyValueForSQL(value)`: renders a value as an SQL literal, for scripts that inline values.

## Node Compatibility

- Node.js 22 or later.

### License

SQB is available under the [BSD 3-Clause](https://github.com/panates/sqb/blob/main/LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/adapter-tests.svg
[npm-url]: https://npmjs.org/package/@sqb/adapter-tests
[downloads-image]: https://img.shields.io/npm/dm/@sqb/adapter-tests.svg
[downloads-url]: https://npmjs.org/package/@sqb/adapter-tests
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/panates/sqb/badge.svg?branch=dev
[coveralls-url]: https://coveralls.io/github/panates/sqb?branch=dev
