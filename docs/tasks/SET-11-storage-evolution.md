# SET-11: SQLite-first storage and future options

- State: Done
- Milestone: Documentation setup
- Related ADRs: [ADR-0003](../adr/0003-sqlite-first-and-storage-evolution.md)
- Requirement IDs: CR-01, CR-03, CR-06, CR-09, CR-10
- Depends on: User's storage direction and the existing documentation/benchmark plan

## Outcome

Document SQLite as the initial store and preserve plans to evaluate PostgreSQL, ClickHouse,
Parquet, and object storage, with explicit roles and evidence-preserving migration criteria.

## Scope

Record the initial choice and future candidates in ADR-0003. Update the engineering/product
references, roadmap, backlog, current state, and benchmark plan. Distinguish operational databases,
analytical databases, dataset formats, and object storage. Check current official descriptions.

## Outside scope

Schemas, SQL, driver selection, code, dependency installation, migrations, cloud provisioning,
credentials, database/benchmark runs, and commits. Future roles and detailed designs remain open.

## Acceptance criteria

- [x] SQLite is explicitly the initial persistence choice.
- [x] Future options have distinct possible roles and adoption criteria without committing to all of them.
- [x] Exact amounts, provenance, unavailable states, and migration/recovery checks are preserved.
- [x] Benchmarks separate storage changes from language changes and account for durability,
  query semantics, concurrency, resource/storage/network costs, and recovery evidence.
- [x] Local links, requirement IDs, status consistency, and the file inventory are checked.
- [x] Documentation-only changes and original logo preservation are confirmed.

## Approval record

- Initial storage direction: User confirmed SQLite is sufficient for now on 2026-11-17 and named
  PostgreSQL, ClickHouse, Parquet, and possible bucket storage as future options.
- Documentation work: Authorized as an addition to the ongoing architecture documentation.
- Schema/driver, future architecture, implementation, provisioning, and benchmark execution:
  Not granted.

## Evidence and handoff

Validated on 2026-11-17:

- Checked 22 Markdown files: no broken local links, unknown CR requirement IDs, or trailing whitespace.
- Confirmed ADR-0001 remains Proposed; ADR-0002 and ADR-0003 record accepted directions without
  implementation authorization. M1-01 remains Proposed and explicitly unapproved.
- Confirmed current state retains the implementation gate and the benchmark plan declares no runs
  or results. Reviewed storage references across the README, engineering/product documents, roadmap,
  backlog, ADR index, and current state.
- Inspected the file inventory: no application code, manifests, dependencies, database files,
  migrations, or benchmark harness were introduced. Changes in this task are Markdown only.
- The logo matches its recorded SHA-256:
  `b45aa4306ed34de83f59a0b3bb13035a33cfb9b77eb370aea6220c1cea91442f`.
- Consulted official SQLite, PostgreSQL, ClickHouse, Apache Parquet, and Amazon S3 documentation;
  references and their retrieval date are recorded in ADR-0003. No storage provider was selected.
- No database integration, provisioning, product tests, or benchmarks were performed. No commit
  was created.

The next implementation task remains M1-01, which is proposed and not authorized. M3 persistence
implementation and the future STORE/BENCH tasks are also unapproved.
