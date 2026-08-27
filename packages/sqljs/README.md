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

## About @sqb/sqljs

This package is a SQB `Adapter` for SQLite backed by [`sql.js`](https://github.com/sql-js/sql.js),
a WebAssembly build of SQLite. Unlike [`@sqb/sqlite`](../sqlite), it needs no native bindings or a
runtime-provided SQLite module, so it runs anywhere WebAssembly does — including the browser.

Pass a file path as `database` to load (and keep in sync with) an on-disk `.sqlite` file, or
`:memory:` (optionally suffixed, e.g. `:memory:test1`) for a purely in-memory database. Databases
opened with the same name are reference-counted and shared across connections rather than reopened.
It shares its SQL serialization rules with `@sqb/sqlite` via [`@sqb/sqlite-dialect`](../sqlite-dialect).

## Installation

```bash
$ npm install @sqb/sqljs --save
```

## Usage

```ts
import '@sqb/sqljs';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'sqljs',
  database: '/path/to/database.sqlite', // or ':memory:'
});
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/sqljs.svg
[npm-url]: https://npmjs.org/package/@sqb/sqljs
[downloads-image]: https://img.shields.io/npm/dm/@sqb/sqljs.svg
[downloads-url]: https://npmjs.org/package/@sqb/sqljs
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
