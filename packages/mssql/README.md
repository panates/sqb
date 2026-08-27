<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![CI Tests][ci-test-image]][ci-test-url]
[![Test Coverage][coveralls-image]][coveralls-url]

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/mssql

This package is a SQB `Adapter` for Microsoft SQL Server, backed by the
[`mssql`](https://github.com/tediousjs/node-mssql) driver (a pure-JS, `tedious`-based
client — no native bindings required).

Unlike MySQL/SQLite/Oracle, SQL Server has a native `OUTPUT` clause, so
`INSERT ... RETURNING` / `UPDATE ... RETURNING` do not need a follow-up `SELECT` — the
adapter rewrites the generated SQL to inject `OUTPUT INSERTED.col, ...` (or
`OUTPUT DELETED.col` for deletes) in the correct position and reads the result straight
from the same statement.

## Installation

```bash
$ npm install @sqb/mssql --save
```

## Usage

```ts
import '@sqb/mssql';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'mssql',
  host: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'yourStrong(!)Password',
  database: 'mydb',
});
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/mssql.svg
[npm-url]: https://npmjs.org/package/@sqb/mssql
[downloads-image]: https://img.shields.io/npm/dm/@sqb/mssql.svg
[downloads-url]: https://npmjs.org/package/@sqb/mssql
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
