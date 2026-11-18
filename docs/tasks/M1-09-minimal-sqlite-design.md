# M1-09: Minimal SQLite driver, schema, and migration design

- State: Done — design delivered; ADR-0007 Accepted
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0003](../adr/0003-sqlite-first-and-storage-evolution.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md),
  [ADR-0007](../adr/0007-minimal-sqlite-evidence-store.md) (Accepted)
- Requirement IDs: CR-01, CR-03, CR-09, CR-10, CR-11; preserve CR-02, CR-04, CR-05, and CR-06 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed M1-01 through M1-08, the accepted SQLite/backend ownership direction,
  existing immutable evidence models, and approval of this bounded design-delivery scope

## Outcome

A concrete proposed storage ADR explains how the existing backend can persist exact observations,
quotation/cycle outcomes, and later validation/invalidation evidence in a minimal local SQLite
store. It selects a justified driver and representation, defines atomic write/read boundaries and
migration/failure behavior, and supplies an implementable validation plan for M1-10.

SQLite/backend ownership and ADR-0007's driver/schema/migration design are accepted.
This task delivers a design for review; it creates no database, package, application code, or
executable migrations. M1-10 still requires separate implementation approval.

## Existing constraints and the design problem

Read-only inspection began at commit `c9414e2`, after the requested M1-08 commit.
[ADR-0003](../adr/0003-sqlite-first-and-storage-evolution.md) selects SQLite and preserves future
storage options; [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md) moves the minimal
store into M1 and assigns application database access to the backend. Domain calculations remain
independent of storage. The current CLI directly invokes shared backend modules; no API/daemon or
database owner process has been implemented.

The [analysis guide](../ANALYSIS.md) and actual models expose several concrete constraints:

- An [observation](../../apps/backend/src/snapshot.ts) has its own attempt ID, origin, selected
  chain/block/hash, timing, configuration/source/policy provenance, registry/checks, requests,
  and validation history. Collection can fail before chain/block/registry fields are available.
- An [analysis](../../apps/backend/src/analysis.ts) references an observation and has a separate
  attempt ID, quote dependencies, configured sizes, all 36 cycle outcomes, qualifications, and
  explicit unavailable cost/net fields. Failure outcomes must survive, not just successful grids.
- Analysis and revalidation can return a new immutable observation with the **same observation
  ID** and additional validation/request events. Revalidating analysis retains its analysis ID.
  Two analyses may share an original observation yet append different events. A single overwrite
  keyed only by the existing ID would lose evidence; the design must resolve identity/versioning,
  branching histories, duplicate prefixes, and idempotency without changing domain meaning.
- Current bigint quantities can exceed signed 64-bit storage. Native SQLite INTEGER is signed
  64-bit; affinity/conversion rules also matter. The representation must preserve EVM amounts,
  ratios, signed gross, exact zero, and unavailable values without Number/REAL coercion.
  [SQLite types](https://www.sqlite.org/datatype3.html).
- Origin and as-of eligibility are separate. A stored live-origin observation is historical
  evidence when read later. Persisted monotonic timestamps cannot establish current eligibility;
  terminal invalidation must not disappear behind an older valid record or a cached best result.

## Scope and planned deliverables

The approved deliverable is [ADR-0007: Minimal SQLite evidence store](../adr/0007-minimal-sqlite-evidence-store.md),
delivered as **Proposed** using the ADR template and subsequently accepted by the user. The
decision and alternatives live in that ADR, actual research/check evidence in this task, and
navigation/current state in their canonical documents.
No separate competing schema specification or implementation scaffold is part of this task.

| Design area | Required decision/detail |
| --- | --- |
| Driver/runtime | Compare the pinned Node runtime's built-in SQLite option with a maintained native-binding alternative such as better-sqlite3. Record exact candidate versions/engine provenance, documented API/type/error/transaction behavior, installation/platform constraints, cleanup, and blocking implications. Bun remains tooling, not a replacement backend runtime. Do not treat newer Node documentation or upstream benchmarks as pinned compatibility/performance proof. |
| Backend boundary/ownership | Define the minimal store operations the backend needs: persist an attempt/result bundle, retain later validation events, fetch a recorded attempt, and list bounded recent history. Explain one-shot CLI ownership, concurrent invocations, shutdown, and the later service/API transition without adding a second collector or new daemon. Bound storage waits/work and separate network collection from database transactions. |
| Evidence model | Compare normalized tables, versioned JSON documents, and a small hybrid against actual reads and preservation needs. Propose logical tables/records, keys, relationships, versions/event identity, constraints, and minimal indexes. Show how original collection, analysis-linked observation state, shared quote references, all terminal rows, and append-only validation/invalidation can coexist without overwrites or orphaned evidence. |
| Exact representation | Specify canonical encodings and binding/decoding for unsigned/signed bigint, rational components, hashes/addresses, timestamps, origin/status/reason, and unavailable/null values. Explain SQL affinity/strictness, JSON bigint strings, range checks, and which comparisons/orderings may occur in SQL. Do not rank decimal text lexicographically or cast authoritative amounts to REAL; storage does not become another financial calculation authority. |
| Atomic writes/idempotency | Specify write points and transaction boundaries for snapshot-only failures, completed analysis bundles, and later validation. Define when a save can be acknowledged, exact retry/deduplication behavior, conflicting immutable IDs/payloads, and uncertain commit outcomes. Storage success requires successful commit; a valid in-memory calculation must not be presented as durably saved after failure. State what a crash before a write cannot preserve. |
| Historical reads | Define bounded query/filter/pagination semantics, stable ordering/ties, how callers obtain complete linked evidence, and how newer invalidation affects displayed history. Preserve original origin and as-of fields while marking retrieval as historical; do not feed restored process clocks or a stored admission/best flag into current live use. No HTTP/history command is added by this design. |
| Local lifecycle/durability | Propose data-path/configuration ownership, connection initialization/verification, foreign keys, journal/synchronization choices, busy/lock handling, checkpoints if relevant, and resource closure. Record effective settings, durability assumptions, engine correctness caveats, and retry bounds. Protect existing data; do not introduce silent reset, destructive fallback, or a backup/restore guarantee without future evidence. |
| Minimal migrations | Specify an initial versioned schema, fresh creation versus existing-file detection, version/checksum tracking as appropriate, transactional migration/rollback behavior, and handling of incompatible/future versions or partially failed initialization. Keep migration SQL/specification in the ADR as documentation; runnable SQL files/tools belong to M1-10. |
| M1-10 handoff | Provide a bounded implementation recommendation and the concrete S01–S08 checks below, including storage-status/error presentation for the existing one-shot flow and compatibility with fixture/live origin. Later API/SSE/UI/process, richer replay/recovery, and schema evolution remain separate tasks. |

No concrete driver, physical schema, journal setting, path/default, migration mechanism, or new
public output contract is selected by this scope document. The approved design task must make
those choices reviewable and record remaining blockers honestly.

## Proposed validation scenarios

S01–S08 are requirements for the design review and a plan for M1-10's actual SQLite checks.
They are not implemented tests or executed database evidence.

| Case | Design must explain / later implementation must verify |
| --- | --- |
| S01 — exact round trips | Amounts beyond Number precision and 64 bits, uint112/uint256-scale values, rational components, signed negative/zero/positive gross, token units, and unavailable costs retain exact values/types. Missing values never become zero; reads do not compute rankings with lossy conversion or text ordering. |
| S02 — identity and history | Persist the original observation, two analyses sharing it, same-ID revalidation results with overlapping/different histories, quote/leg dependencies, and terminal invalidation. Preserve every required relationship/history without overwriting original payloads or silently duplicating events. A later good event cannot resurrect an invalidated observation. |
| S03 — atomic bundles | A complete success/failure bundle is visible after commit or absent/unacknowledged on failed commit, with no success claim for partially saved quotes/cycles. Snapshot-only failure before a registry/block and missing/blocked legs remain representable. Separate saving calculations from later append-only validation. |
| S04 — duplicates/conflicts | Repeating the identical write or retrying an uncertain commit has an explicit idempotent outcome. A conflicting payload under an immutable identity is surfaced rather than replaced. Partial retries cannot create orphaned or duplicated evidence. No unsupported exactly-once guarantee is inferred. |
| S05 — operational failure | Busy/lock, read-only/unwritable path, disk/I/O failure, invalid/corrupt file, interrupted write, and failed commit/migration produce bounded honest outcomes. Specify available recovery/operator actions and which durability claims require future fault-injection evidence. Do not erase a file or weaken settings to manufacture a successful save. |
| S06 — restart/history reads | After close/reopen, bounded reads preserve exact payloads, provenance, failure/validation states, and stable pagination. Live-origin, explicit historical replay, and fixture records remain distinguishable. Loading a record cannot restore live admission from old clocks, flags, or a stored best result. |
| S07 — migration/version handling | Fresh schema creation, repeated startup on the current version, migration rollback, unexpected existing tables, and unsupported future versions have explicit outcomes. Preserve existing data/version consistency after initialization failure; no accidental destructive reset or half-applied migration. |
| S08 — integration/ownership | The existing backend remains the only application storage boundary; concurrent CLI invocations and future service ownership are defined. Storage failures are distinct from quote failure, no successful-save output precedes commit, shutdown touches only owned resources, and sanitization excludes RPC URLs/keys/raw provider diagnostics from rows and operational output. |

Use existing [M1-07 coverage](M1-07-validation-and-regression-coverage.md#evidence-and-handoff)
and archived evidence as shape/reference material; do not convert those reports into fresh live
observations or import a production database. Formal verification, power-loss simulation, storage
benchmarks, and full disaster-recovery/backup automation are not claimed by paper design review.

## Preparation research (historical)

The design must justify the smallest representation/index set that preserves evidence and supports
the initial bounded reads. Keep failure/invalidation records first-class even if a document-based
representation is selected. Explain tradeoffs rather than assuming either full normalization or
one opaque report per ID is sufficient. A wider architectural/policy change returns for review.

The following describes scope preparation, before design-delivery approval. The later
[evidence and handoff](#evidence-and-handoff) resolves the reference gap and records the actual
recommendation. Official references inspected during preparation on 2026-11-18:

- [Node SQLite API](https://nodejs.org/api/sqlite.html) and
  [better-sqlite3's maintained repository](https://github.com/WiseLibs/better-sqlite3) as candidate
  API/compatibility research sources; neither driver is selected or installed by this task record.
- [SQLite storage classes/affinity](https://www.sqlite.org/datatype3.html),
  [transactions](https://www.sqlite.org/transactional.html),
  [WAL and its tradeoffs/caveats](https://www.sqlite.org/wal.html),
  [foreign keys](https://www.sqlite.org/foreignkeys.html), and
  [PRAGMA behavior](https://www.sqlite.org/pragma.html) for settings, constraints, and failure review.

Read-only runtime metadata reported Node **26.3.1** and a bundled SQLite version string **3.53.2**.
No SQLite module/connection was opened. The current Node reference page is for **26.13.1**;
the version-specific 26.3.1 page/source could not be fetched through the web tool. It is not evidence
that every current API exists in the pinned runtime. Resolve exact API/driver/engine compatibility
and relevant correctness fixes during approved design work; actual driver round trips/restart/
failure behavior remain M1-10 gates. No runtime upgrade is authorized to bypass that review.

## Outside scope

- Database creation/opening, including in-memory experiments; executable SQL/migrations, storage
  code/contracts/scaffolding/tests, dependency installation, or application/configuration changes.
- Accepting ADR-0007 on the user's behalf or starting M1-10. Proposed schema/SQL in the
  design document is documentation, not an executed migration or implementation approval.
- New collection/quotation/CLI features, live RPC, API/SSE/UI, application services, new chains/
  providers, gas/cost producers, wallets/transactions, or fork execution.
- ORM/multi-database frameworks, cloud provisioning, PostgreSQL/ClickHouse/Parquet/object-store
  adoption, exports/backfill, benchmarks, automated retention/backup/recovery systems, and deployment.
- Commits and pushes. The user's requested M1-08 commit does not authorize another commit.

## Acceptance criteria

- [x] The user approves this bounded M1-09 design-delivery scope.
- [x] A concrete Proposed ADR compares viable driver/representation alternatives and records a
  justified recommendation, exact runtime/dependency assumptions, and any unresolved blockers.
- [x] The proposed model preserves exact values, source/result relationships, same-ID immutable
  history variants, all outcomes, origin/provenance, and terminal invalidation without overwrite.
- [x] Atomic writes, idempotency/conflicts, historical reads, bounded ownership/lifecycle behavior,
  durability assumptions, initialization/migration versions, and explicit storage failures are defined.
- [x] S01–S08 map to concrete design decisions and a bounded later M1-10 validation plan; planned
  round trips/crash/restart/durability checks are not mislabeled as executed tests.
- [x] The design fits the current backend/CLI and accepted ADRs, preserves calculation/live-state
  semantics, and does not create a general framework or prematurely implement later services.
- [x] Official sources, actual inspection evidence, limitations, navigation, task/current state,
  and backlog are updated; local links/anchors/CR references and whitespace pass.
- [x] Delivery is documentation only, the ADR remains Proposed until the user accepts it, and
  M1-10 implementation/driver installation/database/migrations remain separately gated.

## Planned execution and validation

After approval, trace representative existing snapshot/analysis/revalidation records through the
proposed model on paper, including failures and the shared-ID cases above. Review exact encodings
and query semantics, then write a complete Proposed ADR and document alternatives/assumptions.
Review official version-specific driver/SQLite documentation and release notes without installing
dependencies or opening a database. Clearly separate documented support from unexecuted runtime
claims. Do not turn a design gap into a passing integration claim by using report files as a store.

Check S01–S08 against the concrete recommendation, local links/anchors, CR references, changed-file
scope, credential absence, and `git diff --check`. Record actual research outcomes and unverified
implementation gates. Product tests/live checks are not automatically repeated for Markdown-only
design work. Present the actual ADR for acceptance; do not start M1-10 or write runnable migrations.

## Approval record

- Scope preparation: On 2026-11-18 the user said “commit and then prep m1-09”. The completed
  M1-08 documentation was committed first as `c9414e2`; the remaining authorization is preparation
  of this task scope and its navigation/current-state links, plus read-only inspection/research.
- Existing design acceptance: SQLite and backend ownership are accepted in ADR-0003/0004;
  snapshot/calculation semantics remain governed by accepted ADR-0005/0006.
- Design-delivery approval: Granted on 2026-11-18 for M1-09 only. The user said “i accept” after
  reviewing this bounded scope. This authorizes the Proposed ADR and documentation/research
  checks above, not design acceptance or implementation.
- M1-10 implementation/installation/database/migration approval: Not granted.
- Commit-only authorization: On 2026-11-18 the user said “commit first” after design delivery.
  This authorizes committing the eight M1-09 documentation changes; it does not accept ADR-0007,
  authorize M1-10, or authorize a push.
- Design acceptance: On 2026-11-18, after commit `8360629`, the user said “i accept adr7”.
  ADR-0007 is now Accepted. This does not authorize M1-10 or another commit/push.

## Preparation history

Prepared for review on 2026-11-18 after the requested M1-08 commit `c9414e2`. Read-only inspection
covered requirements, storage/process ADRs, engineering/deployment/benchmark boundaries, and the
actual observation/analysis/quotation/revalidation models. Official references and the unresolved
version-specific Node reference limitation are recorded above. Runtime version-string inspection
did not import a driver or open a database.

At scope-preparation handoff, only this task record and backlog/current-state links had changed
after the M1-08 commit.
No concrete ADR/schema, code/test/helper, dependency, database file/connection, runnable migration,
new live check, benchmark, second commit, push, or later task was introduced. The next action is
review of this bounded design scope, not implementation.

Preparation checks passed: local links/anchors, CR references, and whitespace across 37 Markdown
files (361 local links); unique S01–S08 cases; Proposed/unapproved design state; exactly three
scope/navigation changes; `git diff --check`; no premature ADR/schema; unchanged lockfile/brand
reference and post-M1-08 Git HEAD `c9414e2`; no staged files. No application or database tests ran.

## Evidence and handoff

Delivered on 2026-11-18 as documentation only. The actual review document is
[ADR-0007](../adr/0007-minimal-sqlite-evidence-store.md), not this scope record. At delivery it was
**Proposed**; the user subsequently accepted the design after commit `8360629`. M1-10 remains
unapproved.

### Recommendation and research

The ADR proposes exact better-sqlite3 **13.2.0** on existing Node **26.3.1**, six STRICT tables
with immutable typed evidence documents/revisions, per-observation terminal invalidation,
atomic bundles and explicit saved/not_saved/unknown outcomes. It specifies DELETE/EXTRA,
500 ms lock waiting, 4 MiB document bounds, separate fixture/live default files, checksummed
transactional initialization, and historical reads without restored live admission. Its proposed
default persistence and **cli-v2** output/exit changes are material review points, not current CLI
behavior. No dependency or configuration was changed.

Research used official version-specific sources on 2026-11-18:

- The exact [Node 26.3.1 SQLite API](https://nodejs.org/download/release/v26.3.1/docs/api/sqlite.html)
  resolved the initial inaccessible-reference gap. It documents release-candidate status and
  synchronous APIs. Import/export/prototype inspection confirmed local `DatabaseSync`,
  `StatementSync`, and `setReadBigInts` without constructing a database. Runtime metadata reported
  Node 26.3.1 / SQLite 3.53.2. This checks the alternative's surface, not SQL behavior.
- [Tagged package metadata](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/package.json),
  [API](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/docs/api.md),
  [constructor](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/lib/database.js),
  [wrapper methods](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/lib/methods/wrappers.js),
  and [transaction implementation](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/lib/methods/transaction.js)
  support the proposed native driver's documented Node range, API, timeout, integer-read and
  cleanup/error boundaries. The [tagged engine header](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v13.2.0/deps/sqlite3/sqlite3.h)
  identifies SQLite **3.54.1**; this is source provenance, not a loaded-engine/prebuild test.
  A narrow owned typed facade is proposed; no unverified declaration-package version is selected.
- [SQLite release history](https://www.sqlite.org/changes.html),
  [3.53 branch fix history](https://sqlite.org/src/timeline?from=version-3.53.0&to=version-3.53.4&to2=branch-3.53&y=ci),
  and [3.54.1 release notes](https://www.sqlite.org/releaselog/3_54_1.html) informed the driver
  comparison. Later recovery/corruption-handling fixes beyond bundled 3.53.2 support separately
  pinning a newer engine; not every fix concerns this workload, and no absence-of-bugs claim follows.
- [STRICT tables](https://www.sqlite.org/stricttables.html),
  [type affinity](https://www.sqlite.org/datatype3.html),
  [foreign keys](https://www.sqlite.org/foreignkeys.html),
  [transaction behavior](https://www.sqlite.org/lang_transaction.html), and
  [PRAGMAs](https://www.sqlite.org/pragma.html) informed the schema and failure rules. EXTRA was
  chosen because DELETE-mode FULL alone does not provide its additional directory synchronization.
  Effective settings, hardware durability, and error behavior have not been exercised.

### Actual paper checks

Read-only source tracing covered snapshot/analysis/revalidation types, current CLI ownership,
config precedence, sanitized request/failure records, and ignored database paths. A one-off Python
inspection of the unchanged [M1-05 archive](../evidence/M1-05-live-2026-11-18.json) passed:
original → analysis → revalidation observation identity/core equality; unchanged revalidated
analysis core; exact request/validation prefixes; all 36 rows; unique quote IDs and every non-null
leg reference; and explicit unavailable cost/net states. Source-observation finite-size suitability
remains unavailable. An initial assertion incorrectly assumed the archive's independent `repeated`
run shared an observation ID; inspection corrected that assumption. It has a new collection ID
and supplies no real shared-observation branch evidence.

A separate constructed in-memory paper case checked distinct branches sharing an identical
prefix, an invalidation witness affecting old branches of the same abstract observation ID, and
no invalidation of a fresh observation ID. These labels are not market data or persisted rows.
Neither inspection proves typed-codec round trips, SQL constraints, commit behavior, or durability.
No reusable test/helper or database was created.

### Design coverage and later implementation gates

All S01–S08 have concrete design coverage. The following are **planned M1-10 checks**, not passes:

| Case | Concrete ADR coverage | Required implementation evidence |
| --- | --- | --- |
| S01 | Sections 3–4: typed canonical decimal documents/type map, STRICT outer schema, no SQL financial arithmetic | Real typed round trips beyond int64/uint256-scale ratios, signed/zero/null, escaped pointer keys and string-versus-bigint values; reject malformed maps |
| S02 | Sections 3–5 and 7: parent versions, fixed analysis cores/source references, retained quote links, terminal witness overlay | Two analyses of one source with divergent/overlapping histories, repeated equal events, invalidation across every branch, no changed numeric core |
| S03 | Sections 4–5: deferred root FK, atomic collection/analysis/renewal bundles, explicit acknowledgement | Success/failure/null-block bundles; forced failures at write stages/commit; no partial acknowledgement or orphan |
| S04 | Sections 3 and 5: stable prepared envelopes, byte/identity comparison, no overwrite, one reconciliation | Identical retries/uncertain commits, changed-ID content, original metadata on deduplication, rollback/reopen reconciliation |
| S05 | Sections 2 and 5–6: timeout, fixed reasons, unknown state, no destructive fallback, synchronous interruption limit | Real lock/readonly/path/full/I/O/corrupt/commit/rollback/interruption faults, sanitization, owned-handle cleanup |
| S06 | Sections 3–4 and 7: exact version fetch, historical DTO, independent origin, string keyset cursor | Separate-process reopen, complete original/failed/invalidated records, insertion between pages, old clocks never grant current admission |
| S07 | Section 8: app/version/checksum ledger, atomic initial schema, compatibility verification, no journal-mode coercion | Fresh/repeated/concurrent initialization, failed migration rollback, foreign/nonempty/future/corrupt stores preserved |
| S08 | Sections 1–2 and 5–6: backend-only API, shared modules, cli-v2/save states, post-save eligibility | Pinned native install/engine/settings verification, process/CLI outcomes, credential absence, delayed save expiring eligibility, concurrent owners and shutdown |

If the design is accepted and M1-10 explicitly approved, keep its implementation bounded: verify
the exact native dependency/platform and initialization first; implement codec/versioned write/read
operations; integrate the existing one-shot CLI's proposed persistence/status behavior; then run
the real-file/process/fault scenarios and existing checks with clean frozen-lockfile setup. Any
native install/build script permissions must be reviewed rather than assumed. API/SSE/browser,
daemon ownership, retention, backup/restore, new migrations, and performance comparisons stay later.
At design handoff no M1-10 task, implementation, or installation had started. The user later
requested [M1-10 scope preparation](M1-10-minimal-evidence-store.md); implementation remains unapproved.

### Documentation verification and limits

At design handoff, final documentation checks passed: **38 Markdown files, 384 local links/anchors, and 140 requirement
references**, with no trailing whitespace; unique scope/coverage rows for S01–S08; completed
design-delivery criteria and Proposed/unaccepted ADR state. `git diff --check` passed. Exactly
eight expected Markdown files changed; nothing is staged and HEAD remains `c9414e2`. Source,
tests, manifests, configuration, evidence archives, and accepted ADRs are unchanged. The lockfile
and supplied brand reference retain their recorded SHA-256 values. A scan of all eight changed
documents found no configured endpoint or detected environment credentials.

The existing 158-test/eight-file M1-07 result is historical evidence, not a new M1-09 run.
No application tests, clean install, native load, SQLite connection (including in-memory), SQL,
live RPC, benchmark, or database restart/fault injection ran for this design. Its documentation
commit was separately requested after delivery; no push is authorized.
The next proposed action at design handoff was review of **ADR-0007**. That review is now complete;
the next proposed task was preparation of M1-10's bounded implementation scope for approval.
That scope is now prepared at the user's separate request; review it before implementation.

### Design acceptance follow-up

Recorded the user's explicit “i accept adr7” on 2026-11-18 in the ADR and this task, and updated
the documentation map, ADR index, engineering, roadmap, backlog, and current state. The accepted
technical design is unchanged. At acceptance handoff M1-10 had not been prepared or started; no
code, tests, configuration, dependencies, database connection, commit, or push was introduced by
recording acceptance.
Acceptance-follow-up checks passed across 38 Markdown files: 384 local links/anchors, 140
requirement references, whitespace/final newlines, explicit acceptance metadata, and
`git diff --check`. Exactly eight expected Markdown files changed; no staged files, configured
endpoint, or detected environment credentials were found. HEAD remains `8360629`.
