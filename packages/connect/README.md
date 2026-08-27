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

## About @sqb/connect

`@sqb/connect` is the driver-agnostic connection and ORM layer built on top of
[`@sqb/builder`](../builder). It provides:

- **`SqbClient`** — manages a connection pool for a given `Adapter` (the actual database driver
  package, e.g. [`@sqb/postgres`](../postgres) or [`@sqb/mysql`](../mysql)), and runs queries or
  callbacks against acquired connections.
- **`SqbConnection`** — wraps a single live connection: executes generated queries, streams or
  fetches cursors, and manages transactions (`startTransaction`/`commit`/`rollback`, with
  savepoint support where the adapter allows it).
- **`Repository` / `@Entity`** — a full-featured ORM on top of the client: decorate a class with
  `@Entity`, `@Column`, `@PrimaryKey`, `@ForeignKey` and `@Link`, then use `find`, `findOne`,
  `create`, `update`, `delete` and their `*Many` counterparts, including eager-loaded associations
  and embedded objects.
- **`Adapter`** — the interface each driver package implements, so a new database only needs a
  connection/cursor implementation and a dialect (`SerializerExtension` from `@sqb/builder`) to
  plug into the rest of the stack.

```ts
import '@sqb/postgres';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  dialect: 'postgres',
  host: 'localhost',
  database: 'mydb',
});

const result = await client.execute('select * from customers where id = $1', {
  params: [1],
});
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
$ npm install @sqb/connect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/connect.svg
[npm-url]: https://npmjs.org/package/@sqb/connect
[downloads-image]: https://img.shields.io/npm/dm/@sqb/connect.svg
[downloads-url]: https://npmjs.org/package/@sqb/connect
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/sqbjs/sqb/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
