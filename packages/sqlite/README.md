<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/sqlite

This package is a SQB `Adapter` for SQLite that uses the runtime's own native SQLite
bindings instead of a WASM build:

- [`node:sqlite`](https://nodejs.org/api/sqlite.html) when running under Node.js (>= 22.5)
- [`bun:sqlite`](https://bun.sh/docs/api/sqlite) when running under Bun

The correct driver is picked automatically at runtime — no configuration needed. If you
need SQLite support on a runtime without a native driver (e.g. older Node versions, or
in the browser), use [`@sqb/sqljs`](../sqljs) instead.

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
