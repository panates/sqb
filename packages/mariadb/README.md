<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/mariadb

This package is a SQB `Adapter` for MariaDB, backed by the official
[`mariadb`](https://github.com/mariadb-corporation/mariadb-connector-nodejs) driver. It uses the
driver's named placeholder support (`:name`), which matches the parameter syntax `@sqb/builder`
generates by default.

Unlike [`@sqb/mysql`](../mysql), this adapter does not emulate `INSERT ... RETURNING` /
`UPDATE ... RETURNING` with a follow-up `SELECT`: MariaDB (10.5+) supports `RETURNING` natively on
`INSERT`, `UPDATE` and `DELETE`, so affected rows are read directly from the statement response.

## Installation

```bash
$ npm install @sqb/mariadb --save
```

## Usage

```ts
import '@sqb/mariadb';
import { SqbClient } from '@sqb/connect';

const client = new SqbClient({
  driver: 'mariadb',
  host: 'localhost',
  port: 3306,
  user: 'root',
  database: 'mydb',
});
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.
