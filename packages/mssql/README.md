<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/mssql

This package is a SQB `Adapter` for Microsoft SQL Server, backed by the
[`mssql`](https://github.com/tediousjs/node-mssql) driver (a pure-JS, `tedious`-based
client — no native bindings required).

Unlike MySQL/SQLite/Oracle, SQL Server has a native `OUTPUT` clause, so
`INSERT ... RETURNING` / `UPDATE ... RETURNING` do not need a follow-up `SELECT` — the
adapter rewrites the generated SQL to inject `OUTPUT INSERTED.col, ...` (or
`OUTPUT DELETED.col` for deletes) in the correct position and reads the result straight
from the same statement.

## Installation

```bash
$ npm install @sqb/mssql --save
```

## Usage

```ts
import '@sqb/mssql';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'mssql',
  host: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'yourStrong(!)Password',
  database: 'mydb',
});
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.
