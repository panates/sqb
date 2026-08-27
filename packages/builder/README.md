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

## About @sqb/builder

`@sqb/builder` is the query construction and serialization core the whole SQB stack is built on.
It lets you compose `Select`, `Insert`, `Update` and `Delete` statements as plain JavaScript/
TypeScript objects — with type-checked columns, joins, conditions and parameters — and turns them
into the correct SQL text for whichever database you're targeting, without depending on any driver
or network connection itself.

Serialization is dialect-driven: each target database (Postgres, MySQL, MariaDB, Oracle, SQL
Server, SQLite, ...) is a pluggable `SerializerExtension` that can override how any part of a query
is rendered — identifier quoting, `LIMIT`/`OFFSET` syntax, boolean literals, `RETURNING` support,
and more — while everything it doesn't override falls through to sensible defaults. This is what
lets [`@sqb/connect`](../connect) and the various dialect/adapter packages share one query-building
API across every supported database.

```ts
import { Select, Eq } from '@sqb/builder';

const query = Select('id', 'given_name', 'family_name')
  .from('customers')
  .where(Eq('active', true))
  .orderBy('id')
  .limit(10);

const { sql, params } = query.generate({ dialect: 'postgres' });
```

## Main goals

- Single code base for any sql based database
- Powerful and simplified query coding scheme
- Fast applications with low memory requirements
- Let applications work with large data tables efficiently
- Support latest JavaScript language standards
- Lightweight and extensible framework.

You can report bugs and discuss features on the [GitHub issues](https://github.com/sqbjs/sqb/issues) page

Thanks to all of the great [contributions](https://github.com/sqbjs/sqb/graphs/contributors) to the project.

You may want to check detailed [DOCUMENTATION](https://sqbjs.github.io/sqb/)

## Installation

```bash
$ npm install @sqb/builder --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/builder.svg
[npm-url]: https://npmjs.org/package/@sqb/builder
[downloads-image]: https://img.shields.io/npm/dm/@sqb/builder.svg
[downloads-url]: https://npmjs.org/package/@sqb/builder
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
