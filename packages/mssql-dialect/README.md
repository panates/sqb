
<p style="text-align: center;">
  <img src="https://sqb.panates.com/img/github-hero.webp" width="1280" alt="SQB" />
</p>

<br>

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![CI Tests][ci-test-image]][ci-test-url]
[![Test Coverage][coveralls-image]][coveralls-url]

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/mssql-dialect

This package registers the `mssql` SQL serialization dialect (a `SerializerExtension` for
[`@sqb/builder`](../builder)) used by [`@sqb/mssql`](../mssql). It is loaded automatically when
`@sqb/mssql` is imported, so you normally don't need to depend on it directly.

It adapts query output to T-SQL: `@name` parameter placeholders instead of `:name`, `OFFSET ...
ROWS [FETCH NEXT ... ROWS ONLY]` instead of `LIMIT`/`OFFSET` (SQL Server requires an `ORDER BY`
before `OFFSET`, which the dialect adds automatically when a query needs pagination but has none),
and SQL Server's own reserved-word list. `RETURNING` is rewritten into SQL Server's native `OUTPUT
INSERTED.col` / `OUTPUT DELETED.col` clause rather than being stripped, since SQL Server has no
`RETURNING` keyword but its `OUTPUT` clause achieves the same thing without a follow-up `SELECT`.

## Installation

```bash
$ npm install @sqb/mssql-dialect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/mssql-dialect.svg
[npm-url]: https://npmjs.org/package/@sqb/mssql-dialect
[downloads-image]: https://img.shields.io/npm/dm/@sqb/mssql-dialect.svg
[downloads-url]: https://npmjs.org/package/@sqb/mssql-dialect
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/panates/sqb/badge.svg?branch=dev
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
