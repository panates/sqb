
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

## About @sqb/sqlite-dialect

This package registers the `sqlite` SQL serialization dialect (a `SerializerExtension` for
[`@sqb/builder`](../builder)) shared by both [`@sqb/sqlite`](../sqlite) (native `node:sqlite` /
`bun:sqlite` bindings) and [`@sqb/sqljs`](../sqljs) (the `sql.js` WASM build). It is loaded
automatically when either adapter is imported, so you normally don't need to depend on it directly.

It applies SQLite's `LIMIT`/`OFFSET` syntax and reserved-word list. `RETURNING` is stripped from
the generated SQL; both adapters emulate it with a follow-up `SELECT` keyed on SQLite's implicit
`rowid`, rather than relying on `RETURNING` support that may not be present in every SQLite build.

### Full-text search (FTS5)

The `Match` operator serializes as an [FTS5](https://www.sqlite.org/fts5.html) `MATCH`. The
pattern is an FTS5 query; use `toFtsQuery()` to search for the words a person typed as they are
(each word is quoted, so FTS5 syntax such as `^`, `-`, `:`, `*`, `AND` and `NOT` is matched
rather than interpreted, and a row matches when it has every word - like PostgreSQL's
`plainto_tsquery`).

```ts
import { Match, Param, Select } from '@sqb/builder';
import { toFtsQuery } from '@sqb/sqlite-dialect';

// On the FTS5 table itself:
//   select * from logs_fts where message MATCH :text
Select().from('logs_fts').where(Match('message', Param('text')));

// On a table indexed by an external-content FTS5 table
// (`content='logs', content_rowid='id'`):
//   select * from logs where rowid IN (select rowid from logs_fts where message MATCH :text)
Select().from('logs').where(Match('message', Param('text'), 'logs_fts'));

// The same, comparing the FTS5 rowids with a key of your choosing
// (an aliased table in a join, or an INTEGER PRIMARY KEY by name):
//   ... where l.id IN (select rowid from logs_fts where message MATCH :text)
Select()
  .from('logs l')
  .where(Match('l.message', Param('text'), { table: 'logs_fts', key: 'l.id' }));

const params = { text: toFtsQuery('ORU^R01 refused') }; // '"ORU^R01" "refused"'
```

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
[coveralls-image]: https://coveralls.io/repos/github/panates/sqb/badge.svg?branch=dev
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
