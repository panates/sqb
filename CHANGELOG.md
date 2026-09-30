# Changelog

<!-- rman:documented-up-to 5ad8958a5d221727740afcdfeec9f8ce3d82a0bd -->

## v6.0.11 (2026-09-30)

### 🐛 Bug Fixes

- **builder:** eliminate polynomial ReDoS in table/field/returning-column parsing (8dc04a8)
- **connect:** escape backslashes before quotes in test stringifyValueForSQL (58c7d5e)

### 🧹 Chores

- sync lockfile (b0614f4)
- **ci:** declare explicit GITHUB_TOKEN permissions on test/release jobs (9317847)
- release the whole group together, and floor the changelog at 4.x (d6f63cf)
- bump dependencies and fix .rmanrc.yml's version-cascade config (63727d1)
- clean up `.rmanrc.yml` to simplify group release and changelog settings (620ab84)

### 💬 General Changes

- Merge remote-tracking branch 'origin/dev' into dev (b10d327)

---

## v6.0.10 (2026-09-30)

### 🐛 Bug Fixes

- point coverage badge at panates/sqb dev instead of the abandoned sqbjs/sqb master (776aac4)
- **oracle:** use oracleServerVersionString for dialect version detection (5a990fc)
- **postgres:** correct PgCursor's setPrototypeOf-based cursor adaptation (210b5b6)
- **oracle:** initialize the Oracle client before any connection is made (5b772f6)
- **oracle:** fix env-dev.ts override timing and self-provision the test schema (c216f5a)
- **migrator:** default the Oracle test's connection config when env vars are unset (20a1f6b)

### 📚 Documentation

- Add TSDoc to @sqb/builder's public API (9b1f1be)
- Add TSDoc to @sqb/connect's public API (3dbd757)
- Add TSDoc to @sqb/mariadb-dialect's public API (a7c3342)
- Add TSDoc to @sqb/mariadb's public API (702214a)
- Add TSDoc to @sqb/mssql-dialect's public API (367e743)
- Add TSDoc to @sqb/mssql's public API (61a76ca)
- Add TSDoc to @sqb/mysql-dialect's public API (8873030)
- Add TSDoc to @sqb/mysql's public API (4dc07f1)
- Add TSDoc to @sqb/nestjs's public API (34cc75a)
- Add TSDoc to @sqb/oracle-dialect's public API (374fbbc)
- Add TSDoc to @sqb/oracle's public API (a383274)
- Add TSDoc to @sqb/postgres-dialect's public API (c317ab9)
- Add TSDoc to @sqb/postgres's public API (b9a1fe2)
- Add TSDoc to @sqb/sqlite's public API (b27ad81)
- Add TSDoc to @sqb/sqlite-dialect's public API (58ea4fc)
- Add TSDoc to @sqb/sqljs's public API (db22430)
- Add TSDoc to @sqb/migrator's public API (4500749)

### 📦 Build System

- move the build pipeline into .rmanrc, and let rman stamp the version (38eb09b)
- move to rman 2, github-actions@v3 and the shared preset (51c17af)

### 🧹 Chores

- remove `.rman.yml` and update dependencies in `package-lock.json` to latest versions (4910d94)
- cleanup `package.json` and update `.rmanrc.yml` configuration (e623801)
- add Onur Tokel and Bircan Yuruk to package contributors (671ac64)
- add per-package test script and bump rman/rman-preset (761dd73)
- update package name from `sqb.v4` to `sqb` in package.json (ae26fb9)

---

## v6.0.9 (2026-09-11)

### 🐛 Bug Fixes

- **oracle-serializer:** replace `TO_TIMESTAMP` with `TO_DATE` for better query performance with date types in DELETE queries (62f432d)

### 📚 Documentation

- Update README hero image URL with higher resolution asset (a36484a)
- Replace README hero image URLs with updated higher resolution assets (63e11ab)

### 🧹 Chores

- Relicense under BSD-3-Clause and skip dynamic imports in circular dependency checks (ad97dd2)

---

## v6.0.8 (2026-09-09)

### ✨ Features

- Add Oracle migration adapter to @sqb/migrator (65506b5)
- Add MySQL migration adapter to @sqb/migrator (0a55586)
- Add MariaDB, MSSQL, SQLite and sql.js migration adapters to @sqb/migrator (ddc028e)

---

## v6.0.7 (2026-09-07)

### 🧹 Chores

- Update dependencies including `postgrejs` to v3+ and various other package upgrades (328e0bf)

---

## v6.0.6 (2026-09-02)

### 🐛 Bug Fixes

- Replace `SerializerExtension` references with `Adapter` in AdapterRegistry methods (aba53d6)

---

## v6.0.5 (2026-09-02)

### ✨ Features

- Added positionalParams property for positional parameters in Postgres, MySQL, and MariaDB adapters (cf1d576)

### 🐛 Bug Fixes

- Adjust field serialization to handle reserved words and alias escaping (5bf9e6c)

### 🧹 Chores

- Update dependencies to their latest versions (2ec0f78)

---

## v6.0.4 (2026-08-28)

### 🐛 Bug Fixes

- Adjust field serialization to handle reserved words and alias escaping (95b3c2b)

---

## v6.0.3 (2026-08-28)

### 🐛 Bug Fixes

- Correct named-parameter normalization edge cases in pg-connection (332bbe0)
- Correct named-parameter normalization in mssql-connection (d2bb4bd)

---

## v6.0.2 (2026-08-28)

### ✨ Features

- Add support for named parameter normalization in Postgres and MSSQL adapters (68ea1d6)

---

## v6.0.1 (2026-08-27)

### 🐛 Bug Fixes

- Correct TS2339 in mariadb-connection.ts from any[] narrowing (3012ed8)
- Allow empty filters in deleteMany() and updateMany() (f0d7e64)

### 🧹 Chores

- Bump lightning-pool, mariadb and mysql2 dependency versions (980cce0)

---

## v6.0.0 (2026-08-27)

### ✨ Features

- Add Redis service with health check to GitHub Actions test workflow (1e3ebe6)
- Add reserved word escaping for SQLite dialect (2da53f0)
- Add @sqb/sqlite package with native Node.js/Bun SQLite adapter (d964613)
- Add @sqb/mysql-dialect package for MySQL serialization (66fe54d)
- Add @sqb/mysql package with a mysql2-backed adapter (a62731f)
- Add @sqb/mssql package with an mssql (tedious)-backed adapter (102898b)
- Add @sqb/mariadb-dialect and @sqb/mariadb adapter (7df79bb)

### 🐛 Bug Fixes

- Escape common SQL reserved words and speed up isReservedWord lookup (4e9cb68)
- Prevent crash when fetchAsString requests an unmapped DataType (9577d4d)
- Expand PostgreSQL reserved word list and use Set for lookup (92a868a)
- Prevent duplicate Oracle client init and scan both lib env vars (fd99d52)
- Correct date/version serialization and expand reserved words (f3fdd32)
- Expand MSSQL reserved word list and use Set for lookup (9fc41e3)
- Complete MSSQL dialect for correctness and RETURNING support (7086eff)
- Correct AdapterRegistry.unRegister() to filter the actual list (ade0408)
- Correct empty-array, reserved-word, and INSERT/UPDATE hook bugs (5fdf2e0)
- Adapt mysql test fixtures to Insert()'s new column escaping (19e8091)
- Correct data-safety and index-alignment bugs in connect package (ef6c375)
- Correct portability and data-safety bugs in migrator package (7ab14ed)
- Default mariadb test port to 3307 instead of the driver's 3306 (4718b15)

### 🔧 Refactoring

- Extract Adapter.Features as a named interface (28d0c6a)

### 📚 Documentation

- Allow test:, docs:, style:, and perf: commit types (07ce6d8)
- Rewrite root and per-package README.md files (0548670)

### 🧹 Chores

- Include GitHub Actions workflow file in test cache paths (a574a82)
- Remove Redis service from GitHub Actions test workflow (2023a8a)
- Remove outdated docs/ directory (9050d42)
- Update dependencies and align @nestjs packages to v12 (9b9389c)
- Add mysql, mariadb and mssql services to CI test workflow (9eb3e6a)
- Add Oracle service to CI test workflow (12c899a)
- Persist Oracle container data across restarts (ae97a3b)
- Remove Oracle service from docker-compose configuration (9340530)

### 💬 General Changes

- Document commit message conventions in CLAUDE.md (ef4a21e)

---

## v5.0.7 (2026-08-18)

### ✨ Features

- Add `match` operator, enhance Postgres serialization, and update dependencies to latest versions (9d85c79)

---

## v5.0.6 (2026-08-13)

### ✨ Features

- Expose client configuration through a readonly `config` property (43220e0)

### 🧹 Chores

- Update dependencies to latest versions across the project (8d9eecb)

---

## v5.0.5 (2026-08-05)

### 🐛 Bug Fixes

- Handle array values in Oracle serializer (59806da)
- Enhance Oracle serializer to properly handle external parameters and improve IN operator serialization (df036f1)

### 🔧 Refactoring

- Improve error stack traces by filtering internal and irrelevant lines in query execution (23acba4)
- Replace instanceof checks with type guard functions and streamline compatibility logic (29715c2)

### 🧹 Chores

- Update dependencies across the project (9260f78)

---

## v5.0.4 (2026-05-21)

### 🐛 Bug Fixes

- Update import to use `type` for `FieldInfo` to improve type clarity (d1df82a)
- Update do not work properly if any Raw SQL element exits in values (3241262)

### 🧹 Chores

- Update dependencies (3ca5bb1)

### 💬 General Changes

- Added .claude and graphify-out to git ignore list (3dc8494)
- Add `update-graph` script to package.json (4826394)

---

## v5.0.3 (2026-05-05)

### 🐛 Bug Fixes

- Resolve parent converter reference issue and improve eager fetch handling (037c005)

### 🧹 Chores

- add some test for nested association (791591b)
- Update dependencies to their latest versions, including Node.js engine requirement (21c5030)

---

## v5.0.2 (2026-04-30)

### 🐛 Bug Fixes

- Ensure proper handling of SqlElement values in update command (d0e330c)

### 🧹 Chores

- Update Node.js engine requirement to >=20.0 in package.json (c18705f)

---

## v5.0.1 (2026-04-29)

### 🔧 Refactoring

- Rename `Serializable` to `SqlElement` and update related class and type references across packages (1c14ddc)

### 🧹 Chores

- Updated dependencies (c52b04d)

---

## v5.0.0 (2026-04-25)

### 🐛 Bug Fixes

- Handle whitespace in field and alias parsing for table column expressions (e602509)

### 🔧 Refactoring

- Cleaned up unused imports and redundant variable assignments. no-test (91293af)
- Convert all sql element classes to support callable+constructable style (351d711)
- Removed redundant backward compatibility code and migrated to explicit `type` imports across packages (e126997)

---

## v4.26.1 (2026-04-21)

### ✨ Features

- Added support for optimizer hint variables (2aad5f4)
- Enhanced column parsing with alias support using `fast-tokenizer` (d335036)

### 🧹 Chores

- Updated dependencies across packages (major and patch upgrades) (15c2c5f)

---

## v4.26.0 (2026-03-13)

### ✨ Features

- Added index hint and no-index support (0ede90a)

### 🔧 Refactoring

- Removed indexHint and noIndexHint, added optimizerHint (a5f7315)

---

## v4.25.0 (2026-03-13)

### ✨ Features

- Added index hint and no-index support (57a61a7)

---

## v4.24.1 (2026-03-13)

### ✨ Features

- Added "comment" support to orm (e6046a0)

### 🧹 Chores

- Fixed circular dependency typing error (8cdc920)

---

## v4.24.0 (2026-03-13)

### ✨ Features

- Added "comment" to Query class (2a6f1b4)

---

## v4.23.4 (2026-03-12)

### 🐛 Bug Fixes

- Fixed slow query when using Date params in oracle dialect (9b2483d)
- Date parameters fails on insert and update queries (46b469b)

---

## v4.23.2 (2026-03-10)

### 🐛 Bug Fixes

- OcaConnection do not returns getInTransaction() (c351437)
- Fixed slow query when using Date params in oracle dialect (895047b)

---

## v4.23.1 (2026-03-10)

### 🔧 Refactoring

- Date parameter bind param optimization (5720814)

### 🧹 Chores

- Updated deps (3c086fd)

---

## v4.23.0 (2026-03-10)

### ✨ Features

- Added "dateParamFormat" option to oracle driver (3ffe5c2)

### 🔧 Refactoring

- Refactored NestJS module (cbfa31e)

### 💬 General Changes

- Updated nodejs version (a59fe0c)
- Fixed tests not successfully running with Node v22+ (71d6e9b)

---

## v4.22.0 (2026-02-17)

### 🔧 Refactoring

- Refactored NestJS module (7b81463)

---

## v4.21.1 (2026-01-13)

### 💬 General Changes

- added logger message to sqbclient (8db8973)

---

## v4.21.0 (2025-12-30)

### 🔧 Refactoring

- Removed cjs support. All packages exports esm modules only refactor: Resolved circular deps warnings, not necessary for esm but cjs (cdbe37c)

---

## v4.20.5 (2025-12-29)

### 🧹 Chores

- Updated deps (5d4a3bd)
- Code reformat (c25432e)

### 💬 General Changes

- added env support to sqb client (1c56f37)

---

## v4.20.4 (2025-12-04)

### 🧹 Chores

- Updated deps (dfc9173)

---

## v4.20.3 (2025-11-26)

### 🔧 Refactoring

- Oracle client library will be automatically initialized (0894fbc)

---

## v4.20.2 (2025-09-09)

### 🐛 Bug Fixes

- Fixed error throw issue (02c2df3)

### 🔧 Refactoring

- Minor typing fixes (00df4ad)

---

## v4.20.1 (2025-09-09)

### 🐛 Bug Fixes

- SqbClient and SqbConnection never emits 'error' event on execute (34bd0a0)

---

## v4.20.0 (2025-07-24)

### 🐛 Bug Fixes

- Fixed extension unregister issue (566a588)

### 💬 General Changes

- Updated lint rules and formatting (319db3f)
- Refactored repository (623d830)
- Moved from Jest to Mocha dev: Moved from CircleCI to Github Actions (0deac33)

---

## v4.19.6 (2025-05-28)

### 🐛 Bug Fixes

- Fixed invalid join issue when using same entity in multiple fields (a142943)

### 🧹 Chores

- Updated dependencies (0f97165)

---

## v4.19.5 (2024-11-07)

### 🔧 Refactoring

- Removed testing on create (724d228)

### 🧹 Chores

- Updated dependencies (c9efcad)

---

## v4.19.4 (2024-10-21)

### 🐛 Bug Fixes

- Fixed array values of parameters are wrapped inside an additional array. (0ea79b7)

### 🧹 Chores

- Updated dependencies (838b35e)

---

## v4.19.2 (2024-10-11)

### 🐛 Bug Fixes

- Serialized replaces null values to "is null" but do not remove parameter value from context.preparedParams (d335dbf)

---

## v4.19.1 (2024-10-10)

### 🔧 Refactoring

- set dataType to JSON property if design:type is an entity (2243839)

---

## v4.19.0 (2024-10-10)

### 🐛 Bug Fixes

- [postgresql] Should serialize null bind parameters to "is null" query (fd17efd)
- associationPathCache causes invalid sql generation (e71ab7d)
- Promise bug in adapter test (4db4813)

### 🧹 Chores

- fix lint (293ff7f)

---

## v4.18.0 (2024-09-09)

### 🧹 Chores

- Updated dependencies (b248d37)

### 💬 General Changes

- Now createOnly returns key value(s) of created record (aa6ac15)

---

## v4.17.0 (2024-08-20)

### 🧹 Chores

- Minor changes (7fd00b4)

### 💬 General Changes

- Fixed compatibility for "Node16" and "NodeNext" moduleResolution options (fd7d302)

---

## v4.16.1 (2024-08-12)

### 💬 General Changes

- Applied publint to check package.json (dcf084c)

---

## v4.16.0 (2024-08-12)

### 💬 General Changes

- Rollback to ES2020 (aac42fa)

---

## v4.15.0 (2024-08-09)

### 💬 General Changes

- Made ready for Node16 moduleResolution (b774349)

---

## v4.14.1 (2024-08-07)

### 💬 General Changes

- Implemented better typing for return values of Repository (98508cd)
- Applied new eslint rules (19d2100)

---

## v4.14.0 (2024-07-22)

### 💬 General Changes

- Applied new lint rules and code style Changed serializer and adapter registry methods (793e426)
- Changed dependency name from 'postgresql-client' to 'postgrejs' (205684c)

---

## v4.13.0 (2024-07-17)

### 💬 General Changes

- Added v4 branch (6903755)
- Fixed repo token (f2eb258)
- Generating invalid sql when filter by multiple associated columns (c3eb6ed)
- Applied new lint rules and code style Changed serializer and adapter registry methods (2d7ec9b)

---

## v4.12.1 (2024-07-01)

### 💬 General Changes

- Replaced "pick", "omit" and "include" option with single "projection" option (a91cec6)
- Removed deprecated Repository.find() method (00f9e86)
- Replaced CountCommand with FindCommand in _exists() method to gain performance (1e1a29f)
- Minor fixes (d0f3ae3)
- Moved to @panates/eslint-config, @panates/eslint-config-ts and @panates/tsconfig (a91c440)
- Generates invalid filter when filter root is "or" expression (2c2362b)

---

## v4.12.0 (2024-06-06)

### 💬 General Changes

- Added prettier formatting Updated dependencies (fb98fcd)

---

## v4.11.3 (2024-04-02)

### 💬 General Changes

- Fixed, long field alias causes error in Oracle (e9e3634)
- Updated dependencies (3d8c7cd)

---

## v4.11.2 (2024-03-27)

### 💬 General Changes

- Added UnionQuery to from() (ac69c98)
- Updated dependencies (a500c19)

---

## v4.11.1 (2024-03-20)

### 💬 General Changes

- Fixed strictParams issue for Oracle dialect. (b4f923f)

---

## v4.11.0 (2024-03-15)

### 💬 General Changes

- Updated dependencies, re-format all codes (0fd6e51)
- Added Union and UnionAll queries (0a231db)

---

## v4.0.8 (2023-12-04)

### 💬 General Changes

- Updated dependencies (2e14df4)

---

## v4.10.5 (2023-11-16)

### 💬 General Changes

- Removed EntityMetadata.toJSON which couses unexpeced results for non coulmn properties (2ce69f0)
- Disabled @typescript-eslint/no-unsafe-enum-comparison rule (1af2632)

---

## v4.10.4 (2023-11-10)

### 💬 General Changes

- Fixed missing "emitDecoratorMetadata" option (60be818)

---

## v4.10.3 (2023-11-10)

### 💬 General Changes

- Changed regex pattern in sql scripts from ${x} to $(x). (929347d)
- Improvements (881a409)

---

## v4.10.2 (2023-11-10)

### 🧹 Chores

- Pass MigrationTask on events except task title (be55556)

### 💬 General Changes

- Updated circleci config (17ba8ab)
- Fixed. glob to not list files sorted. (ddd03ee)
- Fixed generating invalid update sql (e2fa63b)
- Added details to error log (ca73345)

---

## v4.10.1 (2023-11-09)

### 💬 General Changes

- Fixed. Added missing "types" export (72c061e)

---

## v4.10.0 (2023-11-09)

### 💬 General Changes

- Disabled some eslint rules (e2570d0)
- Throw error if "emitDecoratorMetadata" is not enabled (ce6cd9a)
- Redesigned migrator for multi package migrations (484fab5)

---

## v4.9.1 (2023-07-21)

### 🐛 Bug Fixes

- EntityOutput should not expose null fields. (67abba9)
- Wrong serialization of "array of object" value (78dc245)

### 🧹 Chores

- Corrected spelling (f5b4ada)

### 💬 General Changes

- Alpha development commit #1 (5a8b3b7)
- Alpha development commit #2 (2c7ffc0)
- Alpha development commit #3 (c936772)
- Alpha development commit #4 (dfad874)
- Alpha development commit #5 (fe5730d)
- Alpha development commit #6 (748fa19)
- Prepared travis for monorepo (a3a57ba)
- Added nestjs package (10a6869)
- Capturing npm errors (b90c189)
- Changed definition behaviour of returning block (6e244f0)
- Passed oracle tests (73dce36)
- Added missed type info (66806ca)
- Commit for alpha.4 (3b1a9d6)
- Test connection is made (7450141)
- Initial commit for @sqb/sqljs (b44e5ce)
- Implemented find(), findOne() and findByPk() (e2e3061)
- One2One relations done (46d6d7d)
- find() sub.sub One2One relations done (81980b2)
- Before operators big change (3a64526)
- Implemented type-guards (a1c634e)
- Find operations with one-2-one and one-2-many implemented. Tests are passing (c7927ca)
- Added transform, update, insert and readOnly decorators (1010710)
- Code review. Working on insert (fc63dcb)
- Dev backup (55959b8)
- Implemented update and updateOnly (94a475a)
- All CRUD implemented (16bdd68)
- All CRUD operations has been implemented and tests ok. (03261c4)
- Alpha 5 release (31b9951)
- Rename Client class to SqbClient Rename Connection class to SqbConnection (1146715)
- Simplified use of Maybe<> (0948853)
- Alpha 7 release (32a48b9)
- Renamed Repository.get to Repository.findByPk (1fe18b8)
- Simplified "path" config in tsconfig files (6002d4f)
- Added strictParams option for generating queries. (4e9c88b)
- Alpha 9 release (748aa6d)
- Implemented transformRead and transformWrite feature (e64796e)
- Removed Sort() decorator (a072726)
- Now we can define datatype is array in Param() (8d10cef)
- Added features property to Adapter interface (4cbd044)
- Added fetchAsString functionality (c3a4bd7)
- Minor test changes (6268b43)
- Compatibility changes (6b0ddfa)
- Added fetchAsString compatibility (6f62492)
- Added array param compatibility (afeeba4)
- Bulk alpha development changes (92f189e)
- Alpha 12 release (576a898)
- convertDataValue throws error for null values (4ca9a90)
- Expose EntityDefinition (ab40871)
- Exposed getOwnElementNames and getElementNames methods (09f21b5)
- Exposed PartialWriter type (2d10290)
- Exposed getElementNames, getOwnElementNames (47fc118)
- Exposed getInsertColumnNames, getUpdateColumnNames (6486edd)
- Generates wrong sql if primary column name of entity is different than table field name (d8c8657)
- Backup before group column (15c49e5)
- Alpha dev backup (3af0191)
- Alpha v20 release (32d6aef)
- Alpha v21 release (c825f0b)
- BaseEntity throws error when construction if not argument given (db6f546)
- Fixed travis config (cc164ef)
- Fixed test (107f2d6)
- Fixed tests (b5d68c8)
- Added more reserved words (1dffa60)
- Fixed typing problem in getInsertColumnNames, getUpdateColumnNames. (a1f3049)
- Fixed include and exclude elements issue (ac179e0)
- Added ability to sort by o2o relation column. Fixed issue of sorting by embedded column (126e5ee)
- Updated dependencies (561d5f7)
- Fixed sort issue in tests (d0fb5c8)
- Throws error while sorting by multiple embedded or relational columns (455d4b9)
- Added distinct query feature (36da5e4)
- Changes before M2M implementation (fc2ea80)
- Dev backup before find command revision (69c7bbe)
- Bulk update for Beta 6 (da9a811)
- Added "sort associated instances" test (38155f6)
- Donwgrade rxjs version to using in nextjs (5440c4e)
- Added helper methods (2887000)
- Added filter option to findById and exists commands (21d39f2)
- Added filter option to update command (44b68c5)
- Added schema support for repository (5831d2a)
- Added type getter to repository (6044f12)
- Added filter option to destroy command (9081de7)
- Updated tsconfig files to not build dist files till run build (509cef0)
- Simplified param serializing (f46e23d)
- Renamed "params" option to "values" (221b374)
- Revert "Renamed "params" option to "values"" (479d97f)
- Added json field support (4b839e6)
- Fixed "include" option works unexpected (be64802)
- Repeating join alias (744556a)
- Added UnionEntity, PickEntity, OmitEntity methods (e9aa55a)
- Added mixinEntities, pickCloneEntity, omitCloneEntity helper methods (e79281d)
- Allow multiple types in mixinEntities() method (e0b6cb7)
- Added support for both nestjs 7 and 8 (f26b812)
- Fixed mixin issue (6f8789e)
- Fixed OmitDto, PickDto issues (02c466d)
- Now Update functions requires key values as first argument. (1c044ac)
- Minor improvement (8a8ac65)
- Added async events support (ff49e4b)
- Ignores prefix and suffix of embedded columns (624e0ee)
- Ignores prefix and suffix of embedded columns in update and create commands (9913828)
- Fixed reserved word issue (720bd97)
- Fixed typing for DeepPickMutable generic type (519be00)
- Updated typing (61000ab)
- findAll returns null is chosen elements has no value (8c7d46b)
- findOne returns null if "elements" has no known field (6ca1ab3)
- Added entity getter to Repository. (0e1e0c4)
- Typescript 4.4 compability (3fc9afc)
- Typescript 4.4 compatibility (f42cd65)
- PostgreSql improvements (419a118)
- SQL generation improvements (bccbeeb)
- Fixed finding sub elements issue (dea4359)
- Fixed invalid query building when using sub select as a value in update and create query (e8fea84)
- Fixed primaryIndex issue in pickEntityInto and omitEntityInto (f6dfaed)
- Made entity model property un-enumerable (5ad2a0d)
- Added savepoint support to postgres (fb1c308)
- It ignores prefix and suffix of embedded columns in filter (9fe2104)
- Moved typings to ts-gems (6ef0db4)
- First release (9bb7f96)
- moved ts-gems from devDependencies to dependencies. (7f76699)
- Updated ts-gems (302f4d5)
- acquire event is not async (1616db7)
- Improvements (88e0d76)
- Fixed memory database for sqlite (bea96f4)
- Updated gulp to ESM (41cef56)
- Rman test (1467f37)
- Updated to rman (951233e)
- Updated to dependencies (4fc8091)
- Updated to dependencies Moved build system to rman (4f8e8a0)
- Fixed config (32b54a1)
- Added migrator package (bdf416b)
- Use Reflect to store Entity metadata (870f00c)
- Use Reflect to store Entity metadata sort imports (5889cd3)
- Use Reflect to store Entity metadata #2 (33864ad)
- Use Reflect to store Entity metadata #3 (46a7d8a)
- Use Reflect to store Entity metadata #4 (5a553b3)
- Use Reflect to store Entity metadata #5 (48c0984)
- Use Reflect to store Entity metadata (final) (2bd0ede)
- Added backward compatibility (f6da6ba)
- Added mixinEntities function backward compatibility (17e687a)
- Minor optimization (cd9657b)
- Ignore undefined arguments in mixin (7f38074)
- Updated repository directories (89c0ba8)
- Changed "inject" to "define" (3077e18)
- Made _obj and _arr properties non enumerable (d130fdb)
- Sort imports (c8520e6)
- Added toJSON() function (bdbd057)
- Fixed typescript build issue (36c17cf)
- Fixed typo (2f37e3f)
- Added "coalesce" expression (2af1e72)
- Optimize Serialization (259948d)
- Added string agg frunction for postgre and oracle (62c4727)
- Fixed oracle server version compare issue (0469059)
- Added sequence getter for postgre and oracle (d438f07)
- Fixed oracle serialization issue for null parameter values (dd7cb72)
- Added "max" and "min" statements (3a1fada)
- Added ESM module support Moved from mocha to Jest for tests (7a8b610)
- Changed "elements" option to "pick" Changed "exclude" option to "omit" (cff5f0c)
- Rename all "element" names to "field" (aabea44)
- Combined all link decorators within Link() Removed previous LinkXXX() decorators. Changed exposing default fields, added exclusive option. (d59dc26)
- Removed unnecessary packages (75e2621)
- fixing postgres-serializer.ts _serializeComparison for "between" operator (7cb1995)
- Fixed typing Updated dependencies (ceef7c3)
- Added "connection-return" event, which fires before a connection returns to the pool. (11ffc3c)
- Fixed exports for multi module support (4634844)
- Fixed an issue that causes error when calling pooled connection.close() Updated dependencies (6e7aadb)
- Invalid SQL generated if there is an object in values (a430ce0)
- Updated dependencies Configured jest for better performance (c3af6b6)
- Moved to dynamic import instead of require (bac245c)
- Added cross join support (e903a5f)
- bug fix: export CROSS JOIN function (68eeedd)
- Removed isolatedModules option (5343f71)
- Removed verbose option (8bd1372)
- bug fix: link not working if source field is an array (06fe79e)
- Improved guessing association targetKey and sourceKey (107311f)
- Changed repository function names to more understanding. Deprecated old functions (9c1f62d)
- Corrected typing naming (d67af69)
- Fix. Throws "does not match returning column" error if field name contains "_" char (0597521)
- Fix. Throws "...does not match order column format" error if field name contains "_" char (e7ed0fa)
- Fixed error handling (9fc4ced)
- Move from "putil-taskqueue" to "power-tasks" (e6507de)
- Added "not" expression (895467f)
- Updated config (2993984)
- Updated (98b8831)
- Updated dependencies Minor fixes (e783ca4)

---

## v4.9.0 (2023-05-10)

### 💬 General Changes

- Fixed error handling (6f0597d)
- Move from "putil-taskqueue" to "power-tasks" (5c0af73)
- Added "not" expression (e0256c0)

---

## v4.8.2 (2023-05-03)

### 🧹 Chores

- Corrected spelling (4158ddf)

### 💬 General Changes

- Fix. Throws "does not match returning column" error if field name contains "_" char (f63cb1d)
- Fix. Throws "...does not match order column format" error if field name contains "_" char (5b1f1b5)

---

## v4.8.0 (2023-05-01)

### 💬 General Changes

- Updated dependencies (0133223)
- Corrected typing naming (c74df0b)

---

## v4.7.0 (2023-04-29)

### 🐛 Bug Fixes

- Wrong serialization of "array of object" value (eed2583)

### 💬 General Changes

- Updated dependencies (02d548f)
- Improved guessing association targetKey and sourceKey (4c61e10)
- Changed repository function names to more understanding. Deprecated old functions (163f6f9)

---

## v4.6.3 (2023-04-14)

### 💬 General Changes

- bug fix: link not working if source field is an array (1c1a336)

---

## v4.6.2 (2023-04-10)

### 🐛 Bug Fixes

- EntityOutput should not expose null fields. (0ba2864)

### 💬 General Changes

- Updated dependencies (28cf4ef)
- Removed isolatedModules option (b7399fb)
- Removed verbose option (641dd4c)

---

## v4.6.1 (2023-03-21)

### 💬 General Changes

- bug fix: export CROSS JOIN function (5710704)

---

## v4.6.0 (2023-03-20)

### 💬 General Changes

- fixing postgres-serializer.ts _serializeComparison for "between" operator (afa99e1)
- Added cross join support (2457293)

---

## v4.5.6 (2023-02-13)

### 💬 General Changes

- Updated dependencies Configured jest for better performance (9bdafa7)
- Updated dependencies (3211289)
- Moved to dynamic import instead of require (6734ae3)

---

## v4.5.5 (2022-10-17)

### 💬 General Changes

- Invalid SQL generated if there is an object in values (804f70c)

---

## v4.0.7 (2022-10-14)

### 💬 General Changes

- Added "connection-return" event, which fires before a connection returns to the pool. (3438160)
- Fixed exports for multi module support (4c8dd31)
- Fixed an issue that causes error when calling pooled connection.close() Updated dependencies (970667f)

---

## v4.5.1 (2022-09-15)

### 💬 General Changes

- Fixed oracle server version compare issue (1a55932)
- Fixed oracle serialization issue for null parameter values (36dbf77)
- Added sequence getter for postgre and oracle (b5719fc)
- Added "max" and "min" statements (5c67f59)
- Added ESM module support Moved from mocha to Jest for tests (337efe0)
- Changed "elements" option to "pick" Changed "exclude" option to "omit" (2c113fc)
- Rename all "element" names to "field" (9ef91fb)
- Combined all link decorators within Link() Removed previous LinkXXX() decorators. Changed exposing default fields, added exclusive option. (79030f5)
- Removed unnecessary packages (a39909a)
- Fixed typing Updated dependencies (7aa6e32)

---

## v4.2.1 (2022-08-08)

### 💬 General Changes

- Optimize Serialization (3b20075)
- Added string agg frunction for postgre and oracle (362bfbe)
- Fixed oracle server version compare issue (1be42d5)

---

## v4.2.0 (2022-07-21)

### 💬 General Changes

- Fixed typo (27ecc6c)
- Added "coalesce" expression (c30d8d8)
- Updated dependencies (f5455be)

---

## v4.1.5 (2022-07-07)

### 💬 General Changes

- Updated repository directories (cff8806)
- Changed "inject" to "define" (081809d)
- Made _obj and _arr properties non enumerable (5156eb9)
- Sort imports (f135441)
- Added toJSON() function (7668f70)
- Updated dependencies (156ef34)
- Fixed typescript build issue (4215178)

---

## v4.1.4 (2022-05-18)

### 💬 General Changes

- Minor optimization (06e1f6f)
- Ignore undefined arguments in mixin (ac64021)
- Fixed mixin issue (a44206e)

---

## v4.1.3 (2022-05-18)

### 💬 General Changes

- Use Reflect to store Entity metadata (b5de269)
- Use Reflect to store Entity metadata sort imports (3793587)
- Use Reflect to store Entity metadata #2 (83a615e)
- Use Reflect to store Entity metadata #3 (19eee6a)
- Use Reflect to store Entity metadata #4 (ccab9b4)
- Use Reflect to store Entity metadata #5 (142a4ca)
- Use Reflect to store Entity metadata (final) (e682e80)
- Added backward compatibility (cf5555e)
- Added mixinEntities function backward compatibility (bfa7a4e)
- Updated dependencies (10dab97)

---

## v4.0.15 (2022-03-31)

### 💬 General Changes

- Added migrator package (9569fb8)

---

## v4.0.14 (2022-03-24)

### 💬 General Changes

- Updated dependencies (8e5063a)

---

## v4.0.13 (2022-03-05)

### 💬 General Changes

- Alpha development commit #1 (cc69d92)
- Alpha development commit #2 (8aa2744)
- Alpha development commit #3 (e28cf12)
- Alpha development commit #4 (0b88249)
- Alpha development commit #5 (40f49d7)
- Alpha development commit #6 (3f2e337)
- Prepared travis for monorepo (674c65b)
- Added nestjs package (09e953c)
- Capturing npm errors (ddc0f52)
- Changed definition behaviour of returning block (6519044)
- Passed oracle tests (dea9b37)
- Added missed type info (6f05912)
- Commit for alpha.4 (91e12aa)
- Test connection is made (62e72ad)
- Initial commit for @sqb/sqljs (874bf18)
- Implemented find(), findOne() and findByPk() (25f6a80)
- One2One relations done (43ddffc)
- find() sub.sub One2One relations done (761b2b9)
- Before operators big change (5fedb7f)
- Implemented type-guards (8fff196)
- Find operations with one-2-one and one-2-many implemented. Tests are passing (7520eb8)
- Added transform, update, insert and readOnly decorators (95f0268)
- Code review. Working on insert (416c3c1)
- Dev backup (fa6b01a)
- Implemented update and updateOnly (364052e)
- All CRUD implemented (937fd5d)
- All CRUD operations has been implemented and tests ok. (e8f9f2a)
- Alpha 5 release (1d11ae5)
- Rename Client class to SqbClient Rename Connection class to SqbConnection (a503f87)
- Simplified use of Maybe<> (399c0a0)
- Alpha 7 release (ab9ed2e)
- Renamed Repository.get to Repository.findByPk (4032ac1)
- Simplified "path" config in tsconfig files (df1e537)
- Added strictParams option for generating queries. (f1deb82)
- Alpha 9 release (0e43b38)
- Implemented transformRead and transformWrite feature (c416468)
- Removed Sort() decorator (7b0e306)
- Now we can define datatype is array in Param() (ae787b2)
- Added features property to Adapter interface (80cd150)
- Added fetchAsString functionality (0fbd9be)
- Minor test changes (1907356)
- Compatibility changes (a724f86)
- Added fetchAsString compatibility (30b5b70)
- Added array param compatibility (4f40c69)
- Bulk alpha development changes (541256d)
- Alpha 12 release (cae2c4a)
- convertDataValue throws error for null values (9b36cd5)
- Expose EntityDefinition (a6f9477)
- Exposed getOwnElementNames and getElementNames methods (f7c75bf)
- Exposed PartialWriter type (bb6e70b)
- Exposed getElementNames, getOwnElementNames (b2c86c9)
- Exposed getInsertColumnNames, getUpdateColumnNames (8735bb9)
- Generates wrong sql if primary column name of entity is different than table field name (78794f4)
- Backup before group column (5677be9)
- Alpha dev backup (d292183)
- Alpha v20 release (7225a6e)
- Alpha v21 release (bb06b10)
- BaseEntity throws error when construction if not argument given (e08ce39)
- Fixed travis config (6cd1b4e)
- Fixed test (6da1104)
- Fixed tests (971e1c6)
- Added more reserved words (d927c97)
- Fixed typing problem in getInsertColumnNames, getUpdateColumnNames. (b3d78e9)
- Fixed include and exclude elements issue (208c189)
- Added ability to sort by o2o relation column. Fixed issue of sorting by embedded column (1797373)
- Updated dependencies (ba7648e)
- Fixed sort issue in tests (eff3b0d)
- Throws error while sorting by multiple embedded or relational columns (47757c2)
- Added distinct query feature (4e03f0e)
- Changes before M2M implementation (3ea1ffb)
- Dev backup before find command revision (25f9eb0)
- Bulk update for Beta 6 (2ae101e)
- Added "sort associated instances" test (989b9eb)
- Donwgrade rxjs version to using in nextjs (20b9555)
- Added helper methods (4e3d54e)
- Added filter option to findById and exists commands (b4e7e93)
- Added filter option to update command (49304df)
- Added schema support for repository (ae92f46)
- Added type getter to repository (449eda2)
- Added filter option to destroy command (1bcc78e)
- Updated tsconfig files to not build dist files till run build (d8ea141)
- Simplified param serializing (3048035)
- Renamed "params" option to "values" (619de9d)
- Revert "Renamed "params" option to "values"" (046f69d)
- Added json field support (db3c801)
- Fixed "include" option works unexpected (2477556)
- Repeating join alias (c8eb3fe)
- Added UnionEntity, PickEntity, OmitEntity methods (c298cf6)
- Added mixinEntities, pickCloneEntity, omitCloneEntity helper methods (a01655d)
- Allow multiple types in mixinEntities() method (d13a821)
- Added support for both nestjs 7 and 8 (ea9b71c)
- Fixed mixin issue (f9e4446)
- Fixed OmitDto, PickDto issues (55d8c41)
- Now Update functions requires key values as first argument. (e75d12e)
- Minor improvement (dc38a85)
- Added async events support (a11a274)
- Ignores prefix and suffix of embedded columns (19ef227)
- Ignores prefix and suffix of embedded columns in update and create commands (ef4b51f)
- Fixed reserved word issue (f75e081)
- Fixed typing for DeepPickMutable generic type (9598851)
- Updated typing (6b47928)
- findAll returns null is chosen elements has no value (27d2d03)
- findOne returns null if "elements" has no known field (bff8a36)
- Added entity getter to Repository. (da60ff8)
- Typescript 4.4 compability (7949f3d)
- Typescript 4.4 compatibility (6b11e20)
- PostgreSql improvements (b8a7b1e)
- SQL generation improvements (9e2db3e)
- Fixed finding sub elements issue (793babb)
- Fixed invalid query building when using sub select as a value in update and create query (b30058f)
- Fixed primaryIndex issue in pickEntityInto and omitEntityInto (0805807)
- Made entity model property un-enumerable (49c0dba)
- Added savepoint support to postgres (1bb9021)
- It ignores prefix and suffix of embedded columns in filter (8d63d8f)
- Moved typings to ts-gems (ade6791)
- First release (061d0ae)
- moved ts-gems from devDependencies to dependencies. (3e6090a)
- Updated ts-gems (f9f251c)
- acquire event is not async (176fd10)
- Improvements (a2f246a)
- Fixed memory database for sqlite (b211bea)
- Updated gulp to ESM (ef1aa44)
- Rman test (d74d810)
- Updated to rman (74b21bd)
- Updated to dependencies (b272f36)
- Updated to dependencies Moved build system to rman (f757f39)
- Fixed config (c9fa773)
