# sqb

SQB is a TypeScript database framework for Node.js, published to npm as `@sqb/*` packages that
release together under one version (lockstep, `v*` tags).

## Layout

- `packages/builder`: the query builder. `packages/connect`: connection pool, ORM and repositories.
- `packages/<db>`: the adapters (postgres, mysql, mariadb, mssql, oracle, sqlite, sqljs).
  `packages/<db>-dialect`: the SQL serializer an adapter loads.
- `packages/migrator`, `packages/nestjs`.
- `support/test-data`, `support/test-db`: fixtures the tests load into each database.

## Tests

CI starts PostgreSQL, MySQL 8.4, MariaDB 11, SQL Server 2022 and Oracle Free 23 as services
(`.github/workflows/test.yml`). Locally, suites for a database that is not running fail with
connection errors. `@sqb/sqlite` uses `node:sqlite`, so it needs Node.js 22.5 or later; every other
package declares `engines.node: ">=22"`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Before every push

The repository uses pnpm (see `packageManager` in package.json). Before every `git push`, run these
steps in order, and push only when all of them pass:

1. `rman deps` - lists dependencies with a newer version.
2. If it lists any, `rman deps -u` to upgrade them.
3. `rman ci` - deletes `node_modules` and lockfiles in every package and reinstalls from scratch, so
   the install matches what CI will do.
4. Check: `rman check` and `rman lint` (the same checks CI runs).
5. Test: `pnpm test`. Test suites for databases not running locally fail with connection errors;
   report those as such rather than as test failures.
6. Commit any changes these steps made to `package.json` files or `pnpm-lock.yaml` with a `chore:`
   commit, then push.
