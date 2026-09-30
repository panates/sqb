
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

## About @sqb/oracle-dialect

This package registers the `oracle` SQL serialization dialect (a `SerializerExtension` for
[`@sqb/builder`](../builder)) used by [`@sqb/oracle`](../oracle). It is loaded automatically when
`@sqb/oracle` is imported, so you normally don't need to depend on it directly.

It covers the parts of Oracle's SQL dialect that differ most from ANSI SQL and other databases:
`FETCH FIRST ... ROWS ONLY` / `OFFSET ... ROWS` for pagination, `TO_DATE`/`TO_TIMESTAMP` literal
wrapping for date and timestamp values, `1`/`0` for booleans (Oracle has no native `BOOLEAN`
literal), Oracle's `LISTAGG` for the builder's `StringAGG` element, `sequence.NEXTVAL` for sequence
getters, and Oracle's own reserved-word list. `RETURNING` is stripped from the generated SQL;
`@sqb/oracle` emulates it with a follow-up `SELECT` instead — using the row's `ROWID` for inserts
and the original `WHERE` clause for updates — the same approach `@sqb/mysql` uses.

## Installation

```bash
$ npm install @sqb/oracle-dialect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/oracle-dialect.svg
[npm-url]: https://npmjs.org/package/@sqb/oracle-dialect
[downloads-image]: https://img.shields.io/npm/dm/@sqb/oracle-dialect.svg
[downloads-url]: https://npmjs.org/package/@sqb/oracle-dialect
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/panates/sqb/badge.svg?branch=dev
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
