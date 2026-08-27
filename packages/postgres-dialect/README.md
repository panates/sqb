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

## About @sqb/postgres-dialect

This package registers the `postgres` SQL serialization dialect (a `SerializerExtension` for
[`@sqb/builder`](../builder)) used by [`@sqb/postgres`](../postgres). It is loaded automatically
when `@sqb/postgres` is imported, so you normally don't need to depend on it directly.

PostgreSQL already speaks close to standard SQL, so this dialect makes fewer changes than most:
`LIMIT`/`OFFSET` for pagination, `= NULL`/`!= NULL` rewritten to `IS [NOT] NULL`, and Postgres's
own reserved-word list. It also rewrites the builder's default `:name` named placeholders into
Postgres's positional `$1, $2, ...` parameter syntax. `RETURNING` is left untouched — Postgres
supports it natively on `INSERT`, `UPDATE` and `DELETE`, so `@sqb/postgres` reads affected rows
straight from the statement response with no follow-up query needed.

## Installation

```bash
$ npm install @sqb/postgres-dialect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/postgres-dialect.svg
[npm-url]: https://npmjs.org/package/@sqb/postgres-dialect
[downloads-image]: https://img.shields.io/npm/dm/@sqb/postgres-dialect.svg
[downloads-url]: https://npmjs.org/package/@sqb/postgres-dialect
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
