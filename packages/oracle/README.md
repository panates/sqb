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

## About @sqb/oracle

This package is a SQB `Adapter` for Oracle Database, backed by the official
[`oracledb`](https://github.com/oracle/node-oracledb) driver. It supports cursors, working
schemas, and `INSERT ... RETURNING` / `UPDATE ... RETURNING` (emulated with a follow-up `SELECT`,
using the row's `ROWID` for inserts).

`oracledb` can run in two modes:

- **Thin mode** (`driverOptions: { direct: true }`) — pure JavaScript, no Oracle Client
  installation required.
- **Thick mode** (the default) — uses Oracle Client libraries for features thin mode doesn't yet
  support. The adapter locates them automatically by scanning `LD_LIBRARY_PATH` and `ORA_HOME`
  for `libclntsh.so` / `libclntsh.dylib` / `oci.dll`.

## Installation

```bash
$ npm install @sqb/oracle --save
```

## Usage

```ts
import '@sqb/oracle';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'oracledb',
  host: 'localhost',
  port: 1521,
  database: 'FREEPDB1',
  user: 'system',
  password: 'yourPassword',
});
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/oracle.svg
[npm-url]: https://npmjs.org/package/@sqb/oracle
[downloads-image]: https://img.shields.io/npm/dm/@sqb/oracle.svg
[downloads-url]: https://npmjs.org/package/@sqb/oracle
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
