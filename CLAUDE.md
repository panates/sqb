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

## Commit messages

Every commit message must start with a type prefix, lowercase, followed by `: ` and a concise, imperative-mood summary (e.g. `fix: Handle array values in Oracle serializer`).

Allowed types:
- `feat:` — a new feature or capability
- `fix:` — a bug fix
- `refactor:` — code change that doesn't add a feature or fix a bug (renames, restructuring, cleanup)
- `chore:` — maintenance work: dependency bumps, CI/tooling changes, config
- `dev:` — internal dev-environment/tooling changes not shipped to consumers (e.g. `.gitignore`, editor/repo scripts)
- `test:` — adding or updating tests only
- `docs:` — documentation-only changes
- `style:` — formatting/whitespace/lint-style changes with no code behavior change
- `perf:` — a performance improvement

Do not invent other types beyond the nine above unless the user explicitly asks for one. Release/version-bump commits (e.g. `5.0.7`) and `Merge pull request #...` commits are exceptions and do not need a type prefix.
