<p style="text-align:center">
  <img src="https://user-images.githubusercontent.com/3836517/32965280-1a2b63ce-cbe7-11e7-8ee1-ba47313503c5.png" width="500px" alt="SQB Logo"/>
</p>

<br>

## About SQB

SQB is an extensible, multi-dialect SQL query builder and Database connection wrapper for NodeJS.

## About @sqb/mariadb-dialect

This package registers the `mariadb` SQL serialization dialect used by [`@sqb/mariadb`](../mariadb).
It is loaded automatically when `@sqb/mariadb` is imported; you normally don't need to depend
on it directly.

Unlike [`@sqb/mysql-dialect`](../mysql-dialect), this dialect does **not** strip the `RETURNING`
clause from `INSERT` and `DELETE` statements: MariaDB (10.5+) supports `RETURNING` natively for
those, so `@sqb/mariadb` can read back affected rows directly from the statement response instead
of emulating it with a follow-up `SELECT`. MariaDB does **not** support `RETURNING` on `UPDATE`
(verified against 11.8), so it is stripped there and `@sqb/mariadb` falls back to a follow-up
`SELECT`, the same way `@sqb/mysql` does for every statement type.

## Installation

```bash
$ npm install @sqb/mariadb-dialect --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.
