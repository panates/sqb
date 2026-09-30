
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

## About @sqb/migrator

`@sqb/migrator` is a schema/data migration runner for SQB. A `MigrationPackage` describes an
ordered set of versioned migrations, each made up of one or more tasks:

- a raw SQL script (a `.sql` file, or an inline string/function),
- a data-insert task (`{ tableName, rows }`), or
- a custom function that runs arbitrary code against the connection.

Migrations and tasks can be declared inline or discovered from disk via glob patterns (e.g.
`v*/migration.json` + `*.task.sql`). `DbMigrator.execute()` loads the package, compares its
migrations against the target database's tracked version, and applies everything up to an
optional `targetVersion` in order — recording progress (and per-task success/error events) in a
`migration_summary` / `migration_events` table pair it creates automatically. Migration scripts
can reference `$(schema)`, `$(tablespace)` and other variables that get substituted per-run.

```ts
import { DbMigrator } from '@sqb/migrator';

const migrator = new DbMigrator();
await migrator.execute({
  connection: { dialect: 'postgres', database: 'mydb' },
  migrationPackage: {
    name: 'my-app',
    migrations: ['migrations/v*/migration.json'],
  },
});
```

PostgreSQL, Oracle, MySQL, MariaDB, SQL Server, and SQLite (both the native `sqlite` driver and
the WASM-based `sqljs` driver) are supported today, via the bundled `PgMigrationAdapter`,
`OracleMigrationAdapter`, `MysqlMigrationAdapter`, `MariadbMigrationAdapter`,
`MssqlMigrationAdapter`, `SqliteMigrationAdapter`, and `SqljsMigrationAdapter`. Each adapter has a
few dialect-driven differences worth knowing:

- **Schema auto-creation.** Postgres, MySQL, MariaDB, and SQL Server all auto-create `infoSchema`
  (`CREATE SCHEMA IF NOT EXISTS`, which for MySQL/MariaDB is just `CREATE DATABASE`). Oracle is the
  exception: a schema *is* a user there, and provisioning one is a DBA-level operation this adapter
  deliberately doesn't attempt — `infoSchema` (if given) is only used as a table-name prefix, and
  that schema/user must already exist. SQLite has no schema/catalog object at all (`sqlite` and
  `sqljs` alike) - `infoSchema` is likewise just a table-name prefix there, and `$(schema)` resolves
  to `main`, SQLite's always-present default database name.
- **Multi-statement `.sql` scripts.** Postgres, MySQL, MariaDB, and SQLite (`sqlite`/`sqljs`) run a
  whole multi-statement script - trigger/procedure bodies included - in one call. Oracle needs
  script-splitting: it follows the standard SQL\*Plus convention where a PL/SQL block (a trigger,
  procedure, function, package body, or a bare `BEGIN`/`DECLARE` block) is terminated by a lone `/`
  on its own line, and everything else is plain DDL/DML, `;`-separated - required because
  `oracledb` runs exactly one statement per call. SQL Server needs a different kind of splitting:
  T-SQL requires `CREATE TRIGGER`/`PROCEDURE`/`FUNCTION`/`VIEW` to be the first statement in their
  batch, so a script mixing e.g. a `CREATE TABLE` with a `CREATE TRIGGER` needs a `GO` on its own
  line between them, same as sqlcmd/SSMS.
- **Locking.** Postgres, MySQL, and MariaDB use their native session-scoped advisory-lock functions
  (`pg_advisory_lock`, `GET_LOCK`/`RELEASE_LOCK`), unaffected by the implicit commit their own DDL
  triggers. Oracle uses `DBMS_LOCK` for the same reason, falling back to running unprotected if it
  isn't grantable in your environment. SQL Server DDL does *not* implicitly commit, so
  `MssqlMigrationAdapter` uses a transaction-scoped `sp_getapplock` instead, released automatically
  when that transaction commits. SQLite (`sqlite`/`sqljs`) is embedded and single-process with no
  server to arbitrate a lock between clients, so locking is a no-op there.
- **MariaDB's `GET_LOCK` rejects a negative timeout** (it warns and returns `NULL` instead of
  waiting forever, unlike MySQL) - confirmed against a live server. `MariadbMigrationAdapter` uses
  a very large positive timeout (2^30 seconds) to get the same effectively-infinite wait.
- **`sqljs` never writes back to disk on its own** - sql.js loads a whole file into memory once at
  connect time and only ever mutates that in-memory copy. `SqljsMigrationAdapter` exports and saves
  the result back to the original file when the migration run finishes (skipped for a `:memory:`
  database), otherwise every applied migration would be silently lost the moment the process exits.

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
$ npm install @sqb/migrator --save
```

## Node Compatibility

- node >= 20.x

### License

SQB is available under [MIT](LICENSE) license.

[npm-image]: https://img.shields.io/npm/v/@sqb/migrator.svg
[npm-url]: https://npmjs.org/package/@sqb/migrator
[downloads-image]: https://img.shields.io/npm/dm/@sqb/migrator.svg
[downloads-url]: https://npmjs.org/package/@sqb/migrator
[ci-test-image]: https://github.com/panates/sqb/actions/workflows/test.yml/badge.svg
[ci-test-url]: https://github.com/panates/sqb/actions/workflows/test.yml
[coveralls-image]: https://coveralls.io/repos/github/panates/sqb/badge.svg?branch=dev
[coveralls-url]: https://coveralls.io/github/sqbjs/sqb?branch=master
