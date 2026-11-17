# 0003: SQLite first, with planned storage evolution

- Status: Accepted
- Proposed on: 2026-11-17
- Decision accepted by user: 2026-11-17; initial SQLite choice and future storage options only
- Related documentation task: [SET-11](../tasks/SET-11-storage-evolution.md)
- Related implementation work: M3, STORE, and BENCH items in [BACKLOG.md](../BACKLOG.md)
- Requirement IDs: CR-01, CR-03, CR-06, CR-09, CR-10 in [CORRECTNESS.md](../CORRECTNESS.md)
- Supersedes: None
- Superseded in part by: [ADR-0004](0004-local-processes-and-gated-deployment.md), for persistence
  timing and backend write ownership; SQLite selection/future storage direction remain accepted

> Historical sequencing below assigns initial persistence to M3. ADR-0004 moves the minimal store
> into M1, assigns database access to the backend, and makes M3 evidence/replay/recovery hardening.
> Keep the original decision text as history; use ADR-0004 and the current roadmap for sequencing.

## Context

The user considers SQLite sufficient for the initial system and wants to leave room for
PostgreSQL, ClickHouse, Parquet, and bucket/object storage as Pooltrace develops through subsequent
milestones. Storage choices should support continued product growth.

Storage evolution is separate from the language evolution in
[ADR-0002](0002-typescript-first-and-measured-evolution.md). A Rust backend could continue using
SQLite, and a TypeScript backend could use a different database. Neither change requires the other.

## Decision

Use SQLite for the initial persistent evidence store when M3 is approved. It will initially hold
the operational records for observations, quotations/candidates, simulation outcomes, and their
provenance. The driver, schema, migrations, writer ownership, backup procedure, and durability
settings require a later design and implementation task; none is selected by this record.

Keep PostgreSQL, ClickHouse, Parquet, and object storage as future candidates. They may replace
or complement the initial store according to demonstrated needs. They are not a required sequence
of upgrades and do not all need to become running services.

### Possible future roles

The roles and adoption criteria below are planning proposals, not selected future architectures.

| Option | Possible Pooltrace role | Reason to evaluate it |
| --- | --- | --- |
| SQLite | Initial local operational evidence store | A simple local application without a separate database server; validate actual load and recovery needs during implementation |
| PostgreSQL | A future operational database replacing SQLite | Shared access, concurrent writers, remote deployment, or operational requirements justify a server database |
| ClickHouse | A historical analytics store or derived query model | Large scans and aggregations over recorded observations need a specialized analytical path |
| Parquet | Versioned dataset exports for research, replay, and analytical tools | Reproducible, portable historical datasets and bulk processing become useful |
| Bucket/object storage | Storage for dataset files and larger artifacts | Remote/shared archives, Parquet datasets, simulation traces, benchmark artifacts, or validated backups need object storage |

SQLite's official guidance distinguishes application-local storage from client/server workloads;
this supports the initial local design but does not establish Pooltrace's measured capacity.
[SQLite use cases](https://www.sqlite.org/whentouse.html).

PostgreSQL provides relational storage with transactions and concurrency features.
[PostgreSQL overview](https://www.postgresql.org/docs/current/intro-whatis.html).
ClickHouse is a column-oriented analytical database.
[ClickHouse overview](https://clickhouse.com/docs/intro).
Parquet is a column-oriented file format, which may be stored locally or in object storage.
[Parquet overview](https://parquet.apache.org/docs/overview/).
Bucket storage holds objects/files; Amazon S3 is one example, not a selected provider.
[Object-storage example](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html).

### Preserve evidence across storage changes

- Keep persistence details outside domain calculations behind a small boundary for the operations
  the application actually needs. Version schemas and migrations; do not build a universal
  multi-database framework or promise identical SQL across engines.
- Preserve exact amounts, units, signed profits, and explicit unavailable values. SQLite's native
  integer storage is signed 64-bit, so the later schema must define a lossless representation for
  EVM amounts. Do not assume a database numeric type or file decimal encoding covers the required
  range without verifying its declared precision and reader/writer behavior.
  [SQLite data types](https://www.sqlite.org/datatype3.html).
- Preserve record identities, relationships, chain/block provenance, observation times, simulation
  context, and stale/invalidation/rejection evidence. A storage change must not relabel constructed
  data as live or fill missing costs with zero.
- Define versioned exports and manifests for historical datasets/artifacts when needed. Include
  source-record references, covered observations, schema version, integrity checks, and completeness
  information so research results can be traced back to evidence.
- For an additional analytical store, define the authoritative source, ingestion/replay behavior,
  freshness/completeness reporting, and how invalidations propagate. An extra copy is not
  automatically a current or authoritative view.
- Before replacement, validate the export/import or backfill, exact-value round trips, relationship
  integrity, duplicates, record counts, and result equivalence. Plan cutover, recovery, and rollback
  explicitly. Any backup claim requires a demonstrated restore procedure.

## Alternatives considered

- **PostgreSQL initially:** may suit a shared deployment, but the current plan does not yet require
  a separate database service. Revisit when the operational requirements are concrete.
- **SQLite indefinitely:** remains viable while it meets measured needs; there is no mandatory
  migration date or assumed size threshold.
- **Operational, analytical, and object stores immediately:** adds data synchronization and operating
  responsibilities before the initial evidence workflow exists.
- **One interchangeable interface for every candidate:** hides meaningful differences between
  transactions, analytical queries, files, and artifact storage. Keep boundaries proportionate to
  actual operations and make later physical designs explicit.

## Consequences

The initial setup stays small while the evidence model and domain boundaries preserve room for
change. Future database migrations still require work; modularity does not remove schema, numeric,
query, or durability differences. Additional stores introduce consistency, recovery, and maintenance
costs that must be evaluated alongside performance.

Compare storage changes using the storage section in [BENCHMARKING.md](../BENCHMARKING.md).
Hold the application/runtime fixed when isolating storage effects; label combined architecture
changes honestly. A more elaborate storage stack is not an established improvement.

## Acceptance and validation criteria

- SQLite is the initial persistence choice, with no future store or provider provisioned now.
- M3's schema/driver and all later migrations require explicit design and implementation approval.
- Future selections have an identified workload, adoption criteria, and a benchmark/recovery plan.
- Migration preserves exact financial values, relationships, provenance, and unavailable states.
- Reports retain raw evidence and disclose storage configuration, resource costs, failures, and
  limitations rather than claiming unmeasured scalability or robustness.

## Approval record

On 2026-11-17 the user confirmed SQLite is sufficient for now and identified PostgreSQL, ClickHouse,
Parquet, and possible bucket storage as future options. This accepts the initial choice and the
intent to preserve room for storage evolution. Future roles, schemas, engines/providers, benchmark
methodology, and implementation remain subject to their own review and authorization.

## Implementation and evidence

Documentation only; see SET-11. No database, driver, dataset export, bucket, migration, or benchmark
has been created. Official references above were checked on 2026-11-17; their product descriptions
are not Pooltrace test results or a provider selection.
