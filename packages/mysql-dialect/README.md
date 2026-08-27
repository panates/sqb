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

## About @sqb/mysql-dialect

This package registers the `mysql` SQL serialization dialect (a `SerializerExtension` for
[`@sqb/builder`](../builder)) used by [`@sqb/mysql`](../mysql). It is loaded automatically when
`@sqb/mysql` is imported, so you normally don't need to depend on it directly — install it only
if you want to `.generate({ dialect: 'mysql' })` MySQL SQL text without pulling in the `mysql2`
driver.

Besides MySQL's reserved-word list and identifier escaping, it accounts for a handful of syntax
differences from ANSI SQL / other dialects that `@sqb/builder`'s default serializer doesn't know
about: `LIMIT`/`OFFSET` instead of the SQL-standard clause (with the `LIMIT 18446744073709551615`
trick MySQL requires for an offset-only query), `1`/`0` instead of `true`/`false` for boolean
literals, `IS [NOT] NULL` instead of `= NULL`/`!= NULL`, and stripping `RETURNING` entirely since
MySQL has no equivalent clause (`@sqb/mysql` emulates it with a follow-up `SELECT` instead).

## Installation

```bash
$ npm install @sqb/mysql-dialect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/mysql-dialect.svg
[npm-url]: https://npmjs.org/package/@sqb/mysql-dialect
[downloads-image]: https://img.shields.io/npm/dm/@sqb/mysql-dialect.svg
[downloads-url]: https://npmjs.org/package/@sqb/mysql-dialect
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
