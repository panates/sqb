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

## About @sqb/mysql

This package is a SQB `Adapter` for MySQL, backed by the [`mysql2`](https://github.com/sidorares/node-mysql2)
driver. It uses `mysql2`'s named placeholder support (`:name`), which matches the parameter
syntax `@sqb/builder` generates by default.

MySQL has no `RETURNING` clause, so `INSERT ... RETURNING` / `UPDATE ... RETURNING` are
emulated with a follow-up `SELECT` (using `LAST_INSERT_ID()` for inserts, and the original
`WHERE` clause for updates).

## Installation

```bash
$ npm install @sqb/mysql --save
```

## Usage

```ts
import '@sqb/mysql';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'mysql2',
  host: 'localhost',
  port: 3306,
  user: 'root',
  database: 'mydb',
});
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/mysql.svg
[npm-url]: https://npmjs.org/package/@sqb/mysql
[downloads-image]: https://img.shields.io/npm/dm/@sqb/mysql.svg
[downloads-url]: https://npmjs.org/package/@sqb/mysql
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
