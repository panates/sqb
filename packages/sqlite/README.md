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

## About @sqb/sqlite

This package is a SQB `Adapter` for SQLite that uses the runtime's own native SQLite
bindings instead of a WASM build:

- [`node:sqlite`](https://nodejs.org/api/sqlite.html) when running under Node.js (>= 22.5)
- [`bun:sqlite`](https://bun.sh/docs/api/sqlite) when running under Bun

The correct driver is picked automatically at runtime — no configuration needed. If you
need SQLite support on a runtime without a native driver (e.g. older Node versions, or
in the browser), use [`@sqb/sqljs`](../sqljs) instead — both adapters share the same
[`@sqb/sqlite-dialect`](../sqlite-dialect) SQL serialization rules, so queries behave
identically either way.

## Installation

```bash
$ npm install @sqb/sqlite --save
```

## Usage

```ts
import '@sqb/sqlite';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'sqlite',
  database: '/path/to/database.db', // or ':memory:'
});
```

## Node Compatibility

- node >= 22.5 (for `node:sqlite`), or any recent Bun version (for `bun:sqlite`)

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/sqlite.svg
[npm-url]: https://npmjs.org/package/@sqb/sqlite
[downloads-image]: https://img.shields.io/npm/dm/@sqb/sqlite.svg
[downloads-url]: https://npmjs.org/package/@sqb/sqlite
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
