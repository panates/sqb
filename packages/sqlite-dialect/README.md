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

## About @sqb/sqlite-dialect

This package registers the `sqlite` SQL serialization dialect (a `SerializerExtension` for
[`@sqb/builder`](../builder)) shared by both [`@sqb/sqlite`](../sqlite) (native `node:sqlite` /
`bun:sqlite` bindings) and [`@sqb/sqljs`](../sqljs) (the `sql.js` WASM build). It is loaded
automatically when either adapter is imported, so you normally don't need to depend on it directly.

It applies SQLite's `LIMIT`/`OFFSET` syntax and reserved-word list. `RETURNING` is stripped from
the generated SQL; both adapters emulate it with a follow-up `SELECT` keyed on SQLite's implicit
`rowid`, rather than relying on `RETURNING` support that may not be present in every SQLite build.

## Installation

```bash
$ npm install @sqb/sqlite-dialect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/sqlite-dialect.svg
[npm-url]: https://npmjs.org/package/@sqb/sqlite-dialect
[downloads-image]: https://img.shields.io/npm/dm/@sqb/sqlite-dialect.svg
[downloads-url]: https://npmjs.org/package/@sqb/sqlite-dialect
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
