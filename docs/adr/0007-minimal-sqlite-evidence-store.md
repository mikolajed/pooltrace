# 0007: Minimal SQLite evidence store

- Status: Accepted
- Proposed on: 2026-11-18
- Decision accepted by user: 2026-11-18; “i accept adr7”
- Related task: [M1-09 design](../tasks/M1-09-minimal-sqlite-design.md)
- Related implementation: [M1-10](../tasks/M1-10-minimal-evidence-store.md#implementation-evidence)
- Requirement IDs: CR-01, CR-03, CR-09, CR-10, CR-11; preserve CR-02/04/05/06 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Supersedes: None; refines the accepted SQLite/backend ownership direction in ADR-0003/0004

## Context

At design time the backend produced immutable observations, analyses, and revalidated copies in
memory without an application database. M1-10 implements the store described here. Ownership is accepted in
[ADR-0003](0003-sqlite-first-and-storage-evolution.md) and
[ADR-0004](0004-local-processes-and-gated-deployment.md); this ADR selects their minimal physical
design. It does not change snapshot/quotation policies or authorize implementation.

An observation ID survives revalidation; two analyses can share that observation and append
different histories. Revalidation also preserves an analysis ID and its numeric results. Updating
one row per ID would overwrite evidence. Storing only a report per run would leave later failures
and shared dependencies ambiguous. SQLite's INTEGER range also cannot hold every financial bigint.

The initial workload is one-shot backend/CLI attempts with small bounded history reads. Browser
queries, a long-running service, large analytical scans, and recovery automation remain later work.
The user accepted this design on 2026-11-18 and separately approved M1-10. Design-stage research
did not open a database; the implementation/task evidence below distinguishes actual validation
from the original plan and unverified hardware guarantees.

## Decision

### 1. Driver and runtime

Use exact **better-sqlite3 13.2.0** in the existing backend workspace on pinned **Node 26.3.1**.
Its tagged source bundles **SQLite 3.54.1**. Keep SQL/codec operations inside a narrow backend
storage module; domain/protocol calculations remain database-independent. Bun remains the package
manager, with the added native package/lockfile and platform compatibility reviewed in M1-10.

The tagged API supplies synchronous `prepare`/`exec`/`pragma`/`close`, `inTransaction`, and
`defaultSafeIntegers(true)`. Use the last setting for SQL INTEGER reads and range-check before
converting bounded metadata to Number. Use bound parameters, `{ timeout: 500 }`, and no verbose
SQL logger. Keep extension loading, arbitrary SQL, and unsafe-mode controls inaccessible to callers.
Explicitly set/verify foreign keys and `trusted_schema=OFF`; register no extension/application SQL
functions. Own statements within the store instance and close the database in `finally`.
[Tagged API](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/docs/api.md),
[tagged wrapper methods](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/lib/methods/wrappers.js).

Use a project-owned narrow typed facade for just these methods and unknown row values; validate
rows at that boundary. This avoids selecting an unverified external declaration version. It is
not a generic database interface or a claim to describe the full vendor API. No facade or module
declaration is created by this design. Native loading, documented API behavior, compile options,
and effective PRAGMAs remain M1-10 verification gates.

| Compared alternative | Documented basis | Reason for this proposal |
| --- | --- | --- |
| Built-in Node SQLite | Local module metadata reports 3.53.2; the exact-version API has the needed synchronous primitives but is stability 1.2, release candidate | Avoids another dependency, but couples engine fixes to the pinned runtime. Later recovery/corruption-handling fixes exist beyond its bundled engine; it is not the recommended store driver here |
| better-sqlite3 **13.2.0** | Tagged package declares Node `>=22` and MIT; its bundled header identifies SQLite **3.54.1** | Recommended so the Node pin can stay fixed with a separately pinned newer engine. Adds a native install/platform boundary that is documented but untested in Pooltrace |
| Bun SQLite | Bun remains the selected package manager/runner | Changing the backend runtime is outside this decision; it is not interchangeable with Node's module |

Candidate evidence: [tagged package](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/package.json),
[tagged engine header](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/deps/sqlite3/sqlite3.h),
[Node's exact-version API](https://nodejs.org/download/release/v26.3.1/docs/api/sqlite.html).
Native INTEGER BigInt support still has SQLite's 64-bit bound; it does not solve uint256 storage.
Upstream benchmark claims are not Pooltrace measurements.

The [3.53 branch fix timeline](https://sqlite.org/src/timeline?from=version-3.53.0&to=version-3.53.4&to2=branch-3.53&y=ci)
includes later hot-journal recovery and corruption-handling changes. Several concern unused
extensions, ATTACH/super-journals, or unusual inputs; this review does not claim every fix affects
the proposed workload. Choosing the tagged 3.54.1 engine avoids treating 3.53.2 as equivalent to
later patched engines. [3.54.1 release](https://www.sqlite.org/releaselog/3_54_1.html).
M1-10 must verify the actual loaded package/engine/source ID, not infer them from a header alone.

### 2. Local ownership, limits, and connection settings

Use one connection per backend invocation. Current standalone CLI invocations are independent
attempts using the same backend module; SQLite serializes their short write transactions. No
global collector lease or new service is introduced. The later API/service task must define
standalone-CLI coexistence before claiming one long-running collection owner; UI code never
opens the file.

Proposed backend setting: `POOLTRACE_DB_PATH`, loaded through the existing file/process precedence.
Resolve relative paths from the repository root. Default live storage is `data/pooltrace.sqlite`;
default fixture storage is `data/pooltrace-fixture.sqlite`. An explicit shared path may contain
both origins, which remain indexed and unchanged. Reject empty paths, NULs, SQLite URI paths,
and `:memory:` for the application command. Use local storage; network-filesystem guarantees are
not part of this design. No URL, credential, or absolute database path enters result evidence.

| Setting/bound | Proposed value and behavior |
| --- | --- |
| Journal | `DELETE`; no WAL/checkpoint lifecycle for this initial one-shot workload |
| Synchronization | `EXTRA` (3), including rollback-journal directory synchronization |
| Foreign keys | ON; verify the effective value on every connection |
| Trusted schema | OFF; use only migration-owned schema and built-in constraint functions |
| Busy timeout | 500 ms; no application retry/sleep loop on lock errors |
| Write transaction | `BEGIN IMMEDIATE`; explicit commit/rollback, no network awaits inside |
| Evidence size | At most 4 MiB UTF-8 per observation document or analysis-core document, including its type map; oversize is an explicit storage failure, never truncation |
| List reads | Default 20, maximum 100 metadata rows per page; payloads fetched by exact version ID |
| Maintenance | No automatic VACUUM, retention/deletion, backups, or journal-file removal |

Choose rollback journaling for the initial small writes and to keep maintenance narrow. WAL can
be reviewed when actual reader/writer workload warrants it. Verify requested settings rather than
assuming defaults: SQLite can ignore an unknown PRAGMA or return an unchanged journal mode.
EXTRA adds a directory sync to DELETE-mode commit; power-loss durability still depends on the
filesystem, storage device, and correct synchronization behavior. These are intended settings,
not a tested hardware durability claim. [PRAGMAs](https://www.sqlite.org/pragma.html),
[transaction control](https://www.sqlite.org/lang_transaction.html), [WAL](https://www.sqlite.org/wal.html).

Synchronous storage can block the event loop. Record elapsed storage time; the 500 ms bound covers
lock waiting, not arbitrary filesystem latency. Keep serialization before transactions, reads
bounded, and RPC/quote work outside transactions. Storage does not reset financial freshness or
extend quote deadlines. M1-10 must demonstrate usable fixture/live behavior under these choices;
do not claim latency/capacity improvements. Add rollback-journal ignore patterns in M1-10 for
nondefault repository paths; default `data/` is already ignored.

### 3. Exact documents and immutable versions

Choose a small hybrid: indexed relational identity/version metadata plus exact document payloads.
Keep quote records, all 36 cycle rows, registry/check evidence, requests, and validation arrays in
the documents. SQL does not compute financial amounts, qualification, or ranking. A later need
for per-route SQL analytics can justify separately reviewed projections.

Define a backend-only codec **storage-evidence-v1** for current Observation and Analysis-core
records. It is not the public `cli-v1` encoding and does not change producer types:

- Preserve strings, booleans, null, finite Number metadata, array order/multiplicity, and optional
  omitted object fields. Reject unsupported objects, nonfinite numbers, cycles, and undefined
  array elements; do not silently stringify/replace them. Number metadata follows existing JSON
  semantics (negative zero normalizes to zero); financial quantities never use Number.
- Encode each BigInt as a canonical signed decimal string; zero is `0`, without leading zeros,
  `+`, exponent notation, or `-0`. Record its exact location in a sorted **bigintPaths** list of
  JSON Pointers (`~`/`/` escaped as `~0`/`~1`). Decode only those structurally validated locations;
  never convert every numeric-looking string. This preserves BigInt versus String in evidence
  dictionaries and ratios whose intermediate numerators may exceed uint256.
- Canonical bytes use recursively sorted object keys in UTF-16 code-unit order, JSON escaping/
  Number spelling from the pinned Node runtime, and ordered arrays. The encoder must explicitly
  emit sorted keys, including integer-looking object keys. Exclude storage receipt times/sequences
  from identity. Byte counts use UTF-8; hash with SHA-256. Codec/field/range consistency is checked
  on write and read without
  re-qualifying or overwriting failed financial evidence.
- Keep financial values in JSON decimal strings and any bigint index value in SQL TEXT, bound
  as strings. Use STRICT tables and JSON-validity checks as structural protection; application
  validation supplies document shape/type/relationship checks. No REAL/NUMERIC affinity or SQL
  casts/sums/text ordering over authoritative amounts. SQLite counters/versions use INTEGER.

[SQLite types](https://www.sqlite.org/datatype3.html), [STRICT tables](https://www.sqlite.org/stricttables.html).
The codec is proposed, not implemented or tested. M1-10 must verify its exact round trips and
reject malformed/missing type paths. Existing report JSON lacks this type map and is not imported.

An observation's immutable **core** is its full typed value excluding `validations`, `requests`,
and `clockInvalid`. Those three fields may vary across derived copies; the rest must match the
original collection exactly. Child histories must retain the parent's complete array prefixes,
including repeated equal entries, and `clockInvalid` cannot change from true to false.

Each observation version has an explicit parent and derivation kind. The collection version has
no parent. A new analysis-derived version extends the exact source version passed to analysis;
revalidation extends the version actually revalidated. Identical content with no change returns
the parent as a no-op. Branches sharing a prefix remain separate versions; do not merge histories
by timestamp or deduplicate indistinguishable actual requests/events.

An analysis's immutable core is its full typed value **excluding `observation`**. Its quotes,
rows, sizes, failures, timings, policy, and cost fields cannot be replaced under the same ID.
Analysis versions attach that core to a specific observation version. Revalidation changes the
attachment through a new version, not the numeric core. A separate source-version reference
records what the original analysis consumed. First analysis may attach its unchanged source
version if no observation fields changed.

Revision IDs are SHA-256 of the canonical envelope: codec version, record kind, logical ID,
parent revision ID (or null), and encoded typed payload/attachment. Exact retries retain this
prepared envelope and therefore the ID. Match existing canonical bytes and all immutable metadata
before accepting a duplicate; a collision/conflicting identity is an error, not an overwrite.
Generated first-insert timestamps/sequences are not compared to a retry's current clock; return
the existing row metadata after verifying its identity/content.
Root clock-context ID is a UUID identifying the collecting process's monotonic clock domain and
is retained in the prepared write envelope. It is provenance only, never permission for replayed
live use. Database storage timestamps/sequences are separate from observation/validation times.

### 4. Initial schema contract

Use six STRICT tables. This is a logical SQL specification for review, not runnable migration
files or a created schema. Every listed mandatory field is NOT NULL; nullable fields are marked `?`.
Opaque IDs/hashes/codec names/documents/type maps are TEXT. Counters, indexes, versions, and bounded
wall-clock storage metadata are INTEGER. All foreign keys are enforced without cascading deletes.

| Table | Columns and identity | Required relationships/constraints |
| --- | --- | --- |
| `observations` | `seq INTEGER PRIMARY KEY AUTOINCREMENT`; unique `observation_id`; `collection_revision_id`; `core_sha256`; `clock_context_id`; `origin`; `chain_id?`; `block_number?`; `block_hash?`; `recorded_at_ms` | Origin enum live/historical/fixture; chain/block numbers canonical decimal TEXT when present, hash normalized for the index only. Deferred composite FK `(observation_id, collection_revision_id)` → observation versions. Root metadata/core/context never update. |
| `observation_versions` | `seq INTEGER PRIMARY KEY AUTOINCREMENT`; unique `revision_id`; `observation_id`; `parent_revision_id?`; `derivation` collection/analysis/revalidation; `codec`; `payload_json`; `bigint_paths_json`; `recorded_at_ms` | FK to observation root; unique `(observation_id, revision_id)`; composite parent FK to that same observation. Parent null iff derivation collection, with a unique partial index on collection observation ID. JSON valid, fixed storage-evidence-v1 codec, identity/core/prefix checks in the store. |
| `analyses` | `seq INTEGER PRIMARY KEY AUTOINCREMENT`; unique `analysis_id`; `observation_id`; `source_revision_id`; `codec`; `core_json`; `bigint_paths_json`; `core_sha256`; `recorded_at_ms` | FK to observation; composite FK to its source observation version; unique `(analysis_id, observation_id)`. Fixed storage-evidence-v1 codec. Core document preserves all quotes/rows; store checks unique quote IDs, row/leg references and original source identity/hash, including explicit unavailable/blocked cases. |
| `analysis_versions` | `seq INTEGER PRIMARY KEY AUTOINCREMENT`; unique `revision_id`; `analysis_id`; `observation_id`; `observation_revision_id`; `parent_revision_id?`; `recorded_at_ms` | Composite FKs to analysis/observation identity and observation version; unique `(analysis_id, revision_id)` for same-analysis parent FK. One initial parent-null version per analysis. Attachment must be the source or its descendant; revalidation follows the actual prior attachment. |
| `observation_invalidations` | Primary key `observation_id`; `witness_revision_id`; nonnegative `validation_index`; `recorded_at_ms` | Composite FK to that observation version. Index identifies an actual `canonical: invalidated` event in its document. Insert the first witness atomically; never clear/update/delete it. Later evidence remains in version documents. |
| `schema_migrations` | Primary key positive `version INTEGER`; `checksum`; `applied_at_ms`; `node_version`; `driver_version`; `sqlite_version`; `sqlite_source_id` | One initial row for version 1; exact migration-text SHA-256 fixed by the reviewed M1-10 migration. No invented checksum in this design. |

Validate payload-derived index fields against document content. An original field's case/string
representation is preserved inside its payload; normalized hash indexes do not rewrite it.
The deferred root/version FK allows atomic insertion of the initial pair while preventing a
committed observation with no collection document. Other references cannot point into a different
observation/analysis. Check JSON shape, parent ancestry, and witness contents in the backend,
since foreign keys alone do not validate document internals.

Reject UPDATE/DELETE on all six tables with migration-owned immutable-row triggers; version 1
has only append/no-op data operations. Future migration/retention changes must explicitly revise
that contract. Checksums/hashes detect supported read/write inconsistencies, not malicious
database modification or authenticity of provider evidence.

Additional indexes are limited to `(origin, seq)` on observations, `(observation_id, seq)` on
analyses/observation_versions, and `(analysis_id, seq)` on analysis_versions; unique/FK supporting
indexes above are mandatory. Exact ID lookups use unique keys. No global ranking/amount index.

The invalidation marker applies to the **observation ID and all its analyses/branches**, including
older good versions loaded later. It does not rewrite source documents. A fresh collection is a
new observation and uses the existing verification policy; this is not a permanent block-hash ban.
Earlier as-of validity and subsequently known invalidation are shown separately.

### 5. Writes, acknowledgement, and failures

Provide narrow backend operations: store a collected observation; store initial analysis against
its saved source version; append an observation/analysis revalidation version; get a recorded
version; list bounded attempt metadata. These are proposed operations, not new public interfaces.

Before a write, prepare and validate the complete typed envelope and stable IDs. Inside one
`BEGIN IMMEDIATE` transaction, check existing identities/parents, insert only missing compatible
rows, insert an invalidation witness if present, and COMMIT. No `REPLACE`, financial recomputation,
network call, partial-child acknowledgement, or destructive conflict recovery. Identical persisted
data is idempotent only after all referenced rows/bytes are verified; commit any new attachments
as one unit.

| Write point | Atomic unit and consequence |
| --- | --- |
| After collection, before analysis | Root plus collection version and any invalidation witness. Persist even a failed observation with null chain/block/registry. If saving fails, retain diagnostic output, do not begin analysis, and report storage failure. |
| After analysis | Analysis core plus attached observation version (if changed), analysis version, and any witness. Store rejected/incomplete/cancelled outcomes and all 36 rows. The previously committed original collection remains valid history even if this transaction fails. |
| After explicit renewal | New observation version, optional new analysis attachment, and witness together. Original numeric core/source versions remain unchanged. A no-op does not fabricate an event. |

Do not deduplicate a different run that happens to share a block/amount; attempt IDs remain distinct.
If the same root ID has a different immutable core/context or an analysis ID has different numeric
content, fail with `storage_conflict`. Preserve the existing data. A saved invalidation marker can
never be replaced by a later good branch. Queries/publication consult it for all dependent records.

Save status is independent of calculation/quote status:

- **saved:** COMMIT returned successfully, or a single fresh read-only reconciliation confirmed
  the exact target revision and all required relationships are committed. Return version IDs.
- **not_saved:** no commit was attempted, or rollback/nonexistence was established after a
  definite failure. Do not label a partial bundle saved.
- **unknown:** an I/O/commit outcome cannot be determined. Close/rollback as possible, then make
  at most one fresh read-only lookup by the prepared IDs. If uncertainty remains, expose unknown;
  do not replay the collection or loop on writes. Retrying the same envelope may later reconcile it.

Never print raw SQLite errors, SQL with bound values, paths, credentials, or raw provider data.
Map known lock/readonly/full/I/O/corrupt/version/conflict/encoding cases to fixed storage reasons;
an unclassified failure remains `storage_unavailable`. On statement/commit failure attempt rollback
if a transaction remains active, then close; rollback failure keeps the outcome unknown unless
fresh committed evidence resolves it. Unknown is never silently converted to not_saved or saved.
[SQLite transaction/error behavior](https://www.sqlite.org/lang_transaction.html).

Accept only the existing sanitized producer fields: request method/timing/fixed outcome, provider
label/configuration revision, and typed result evidence. Do not add endpoint configuration,
transport objects, raw responses, exception messages, or arbitrary caller diagnostics to documents.
Reject unsupported fields rather than silently stripping or storing them. Keep operational storage
diagnostics outside the immutable financial payload; test credential absence in M1-10.

A crash before a write cannot preserve the uncommitted in-memory result. A crash after collection
commit but before analysis commit leaves only the original observation. No durable start-of-RPC
queue, exactly-once collection, or crash-resume/retry service is proposed.

### 6. CLI integration and time after storage

For M1-10's separately approved implementation, propose default persistence in both existing
analysis modes, with separate default fixture/live files. Help and invalid argument/market-config
checks run before any database access. Storage initialization failure occurs before RPC. Do not
introduce a new analysis mode, daemon, history command, or credential-bearing URL argument.

Propose **cli-v2** for the storage-bearing command output; preserve archived cli-v1 as history.
Existing result/eligibility meaning stays intact. Add an independent `persistence` result containing
`status`, fixed `reason` or null, saved collection/analysis revision IDs when confirmed, and an
acknowledgement wall time. A write ID/time is storage provenance, not a new market observation.
No database path or assumed saved=false default for uncertain commits.

Exit 0 requires a usable result **and confirmed saved evidence** (or help). Exit 1 includes
unusable calculation/runtime/storage failure or unknown save; exit 2 remains pre-I/O invalid
configuration/usage; interruption remains 130 and reports any known prior successful save plus
the cancelled/unknown current write. If calculation was usable but storage failed, retain its
as-of diagnostics and separate persistence failure; do not claim it was stored successfully.

After analysis save, call the shared use-time preparation once. If it renews validation, save
that new version/attachment once, then recompute eligibility **after the last commit** without
an unbounded renew/save loop. If storage elapsed time makes the result stale/validation-expired,
publish it as unusable with the actual saved IDs; do not renew indefinitely or weaken thresholds.
Consult any stored invalidation of this observation before publication. The published eligibility
view incorporates that witness as terminal and includes its revision/index in persistence metadata;
it does not fabricate a fresh RPC validation event or claim the saved document was rewritten.
Raw original/as-of documents remain intact. If cancellation occurs during collection/quotes,
attempt at most one terminal failure save when the store remains usable; skip renewal/network
work and do not retry a failed/unknown storage transaction. Close only owned handles. A synchronous
SQLite call cannot be promptly interrupted by a JavaScript SIGINT handler; handle cancellation
when control returns and disclose the confirmed/unknown save status with exit 130. There is no
hard interruption-latency claim beyond the separately stated lock-wait bound.

M1-10 implements these CLI/configuration changes and updates contract/process tests. Current
output is cli-v2; archived cli-v1 remains historical evidence. The root README owns usage.

### 7. Historical reads and integrity

Fetch one exact observation version or reconstruct an analysis from its immutable core and
attached observation version. Verify canonical hash/type maps/metadata/references on every load;
corrupt/incompatible data is an explicit read failure. Do not feed that decoded object directly
into live eligibility/revalidation. A history DTO preserves original `origin` and as-of fields,
adds retrieval context `historical` and known-invalidation witness, and supplies **no current live
admission or authoritative current best**. Revalidation after process restart requires a new
collection; old process clocks are evidence only. This does not prohibit later approved historical
replay against explicit pinned state.

List observations and analyses separately by their creation `seq DESC`, with optional exact origin
or parent-observation filter. Use parameterized keyset pagination: capture a maximum sequence on
page one, then constrain `seq <= highWater` and `seq < lastSeq`. Return decimal-string cursors,
not unsafe Number counters. Deletes/retention are absent. Membership/order is bounded by this
cursor, but new invalidation knowledge can appear between pages; do not claim a frozen historical
eligibility snapshot. Lists return metadata, not every large JSON document.

### 8. Initialization, migrations, and operator boundary

Use application ID **0x50545243** (PTRC), `user_version = 1`, and one checksummed migration ledger.
Before modifying an existing file, inspect its application/version/schema identity through an
opened connection; unknown nonempty files and unsupported versions fail closed. Do not change
their journaling/schema merely to make them look compatible. SQLite itself may perform hot-journal
recovery while opening; never delete a journal manually.

For a new/empty file only, set and verify the proposed connection settings, then under
`BEGIN IMMEDIATE` create all six tables/indexes, migration row, application ID and user_version;
COMMIT together. Recheck version/schema inside the write transaction so competing initializers
do not race. A matching version-1 file verifies application ID, exact migration checksum,
expected table/index/trigger/FK structure (including STRICT and CHECK constraints), effective
connection settings, and readable metadata; it does not rerun creation. Require an existing store's
persistent journal mode to be DELETE; an unexpected
mode fails `storage_configuration` without switching it. Set/verify per-connection foreign keys,
trusted schema, synchronization, and timeout. Future or unexpected version/structure fails
`storage_schema_version` or `storage_corrupt`; no silent ALTER/reset/downgrade or guessed legacy
import. A failed initialization rolls back all schema/ledger/version changes; an empty file may
remain and must be recognized as
uninitialized on the next attempt. Do not delete an existing file on failure.

Use bounded open/read/write error handling and verify each requested PRAGMA. Full integrity/
foreign-key checks are M1-10 validation/operator checks, not an unbounded automatic scan on every
CLI invocation. File/parent permission, disk/I/O, checksum, and compatibility errors preserve the
file for inspection and explain a fixed actionable reason. No in-place repair, backup copying,
export/import, automated restore, or durability guarantee is implied. M3 owns broader recovery.

## Alternatives considered

- **Fully normalized quote/cycle schema:** enables SQL analytics but duplicates more producer
  structure and requires more migrations before those queries exist. The hybrid retains exact
  payloads and strong outer references; document-internal integrity is application-validated.
- **One mutable JSON blob per attempt ID:** simplest writes, but loses revalidation branches or
  overwrites original evidence. Immutable typed versions make that distinction explicit.
- **Global event deduplication:** current request/validation records lack independent event IDs;
  equal content/time does not prove the same event. Preserve arrays/prefixes and branches instead.
- **One table for every future store or full event-sourcing framework:** unnecessary generic
  machinery. The proposed six tables cover only current observation/analysis history and migration.
- **WAL initially:** useful for some reader/writer patterns, but adds checkpoint/sidecar lifecycle
  without a measured need here. Revisit alongside real service/read workloads, with engine/version
  correctness review and equivalent durability tests.
- **Async/native worker store now:** can isolate blocking operations but adds queue/shutdown
  semantics. The bounded synchronous proposal must pass integration checks; unacceptable stalls
  trigger a reviewed change, not a claimed performance win.
- **Optional success-only storage:** leaves failed attempts/invalidation unpreserved and makes
  missing history ambiguous. Both modes and failure outcomes use the same explicit save boundary.

## Consequences and remaining gates

The store preserves original payloads and branching validation without storing financial integers
in SQL numeric columns. It trades repeated observation documents and a small typed codec for a
larger normalized schema. Application integrity checks, sync I/O, storage growth, and native-driver/
platform compatibility require actual verification. There is no measured capacity, backup, power-loss,
or cross-platform guarantee. Future query/retention needs may justify another design.

M1-10 verifies the selected native driver/engine, effective settings, SQL/schema/codec behavior,
owned-file/process interruption, contention, and CLI integration. Its task records native cases
separately from injected I/O/commit/rollback failures. Actual power loss, physical disk failure,
other-platform compatibility, backup/restore, and performance remain unverified.

## Acceptance and validation criteria

The [M1-09 S01–S08 matrix](../tasks/M1-09-minimal-sqlite-design.md#proposed-validation-scenarios)
is the later implementation plan: exact typed round trips; identity/history branches; atomic
bundles; idempotency/conflicts; operational failure; restart/history isolation; migrations; and
backend/CLI ownership. M1-10 must use real temporary SQLite files and separate-process restart/
contention/interruption cases, alongside the existing arithmetic/protocol/process suite and clean
frozen-lockfile setup. Those are planned checks, not design-stage test results.

Required examples include same-ID branch replay without loss, rejection of changed numeric core,
one invalidation making all old branches visibly invalid, zero versus unavailable costs, amounts
beyond int64, stable list cursors, commit/rollback/unknown outcomes, and an I/O delay expiring
eligibility after save. No new live qualification claim can come from database loading.

## Approval record

The user approved M1-09's documentation/research scope on 2026-11-18 with “i accept”. After the
design delivery was committed as `8360629`, the user said “i accept adr7” on 2026-11-18, accepting
this ADR's driver, evidence/version model, lifecycle, CLI integration, and migration/failure design.
The user separately said “i accept m1-10” on 2026-11-18; its task owns that implementation approval.
The user separately requested a documentation commit after M1-10 scope preparation; that request
is recorded in its task, as is the later completion-commit request. No later task or push is
authorized. Design acceptance and
implementation authorization are separate under [WORKFLOW.md](../WORKFLOW.md); acceptance supplies
no runtime or market evidence.

## Implementation and evidence

Design research/paper checks and their limitations belong to
[M1-09 evidence](../tasks/M1-09-minimal-sqlite-design.md#evidence-and-handoff). The separately approved
[M1-10 implementation](../tasks/M1-10-minimal-evidence-store.md#implementation-evidence) owns the
driver/facade, codec, executable version-1 schema, store, cli-v2, actual native/offline/process/live
checks, and remaining limitations. Official pinned references were rechecked on 2026-11-18.
Earlier observations and archived reports remain unchanged historical evidence.
