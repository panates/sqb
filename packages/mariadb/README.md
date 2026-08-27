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

## About @sqb/mariadb

This package is a SQB `Adapter` for MariaDB, backed by the official
[`mariadb`](https://github.com/mariadb-corporation/mariadb-connector-nodejs) driver. It uses the
driver's named placeholder support (`:name`), which matches the parameter syntax `@sqb/builder`
generates by default.

Unlike [`@sqb/mysql`](../mysql), `INSERT ... RETURNING` and `DELETE ... RETURNING` don't need a
follow-up `SELECT`: MariaDB (10.5+) supports `RETURNING` natively for those, so affected rows are
read directly from the statement response. MariaDB has no `UPDATE ... RETURNING` (verified against
11.8), so that one case still falls back to a follow-up `SELECT`, the same way `@sqb/mysql` handles
every statement type.

## Installation

```bash
$ npm install @sqb/mariadb --save
```

## Usage

```ts
import '@sqb/mariadb';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'mariadb',
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

[npm-image]: https://img.shields.io/npm/v/@sqb/mariadb.svg
[npm-url]: https://npmjs.org/package/@sqb/mariadb
[downloads-image]: https://img.shields.io/npm/dm/@sqb/mariadb.svg
[downloads-url]: https://npmjs.org/package/@sqb/mariadb
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
