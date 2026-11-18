# M1-10: Minimal SQLite evidence store

- State: Proposed — preparation only; implementation approval pending
- Milestone: M1 — local read-only research application
- Related ADRs: accepted [ADR-0007](../adr/0007-minimal-sqlite-evidence-store.md),
  [ADR-0003](../adr/0003-sqlite-first-and-storage-evolution.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md)
- Requirement IDs: CR-01, CR-03, CR-09, CR-10, CR-11; preserve CR-02, CR-04, CR-05, and CR-06 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: completed M1-01 through M1-09, accepted ADR-0007, and explicit approval of this scope

## Outcome

The existing one-shot backend/CLI stores original observations, all analysis outcomes, and later
validation/invalidation evidence in local SQLite. Exact typed values and linked history survive
close/reopen. Output distinguishes calculation quality from confirmed, failed, or uncertain saves.
Stored evidence is historical on retrieval and cannot restore current live admission.

This task implements the accepted design, including default persistence and cli-v2. Preparation
creates only this record and documentation links; installation, code, tests, SQL, and database
opening/creation remain pending implementation approval.

## Scope

### 1. Verify the native driver and initialize the store

- Add exact **better-sqlite3 13.2.0** to the existing backend workspace with Bun and update the
  lockfile. Keep Node 26.3.1 and the other toolchain/dependency pins. Review the selected package's
  install/build behavior and necessary native-package trust rather than enabling arbitrary scripts.
  Use ADR-0007's narrow owned typed facade and runtime row validation; do not add an ORM or an
  unreviewed declaration-package version.
- Verify actual native loading on the available host, the loaded SQLite version/source ID, and
  compile options needed by the schema. The tagged design source identifies SQLite 3.54.1;
  source metadata alone is not a successful load or platform-compatibility check. Recheck exact
  version-specific official sources during implementation. A material incompatibility returns
  for a decision rather than silently changing the accepted driver or Node runtime.
- Implement backend-owned path configuration and one owned connection per invocation. Use
  `POOLTRACE_DB_PATH` with existing root-file/process precedence, root-relative paths, and separate
  defaults `data/pooltrace.sqlite` / `data/pooltrace-fixture.sqlite`. Validate the rejected path
  forms and protect existing files as ADR-0007 specifies. Document local-file permissions/parent
  creation behavior and add ignored rollback-journal patterns for nondefault repository paths.
- Implement the single version-1 migration: all six STRICT tables, constraints, immutable-row
  triggers, minimal indexes, exact migration checksum/ledger, application ID, and user_version.
  Initialize atomically and recheck identity under the write lock. Verify existing schema/settings;
  preserve foreign, unexpected, future-version, corrupt, or incompatible files without reset or
  journal-mode conversion. No later schema upgrade or generic migration framework is included.
- Set and verify DELETE journaling, EXTRA synchronization, foreign keys ON, trusted schema OFF,
  safe integer reads, and 500 ms busy timeout. Bind values; no extension loading or exposed raw SQL.
  Close owned handles on every terminal path. The timeout bounds lock waiting, not filesystem
  latency or synchronous-call interruption.

### 2. Preserve exact evidence and immutable history

- Implement storage-evidence-v1 for typed Observation and Analysis core, with canonical decimal
  bigint strings, validated JSON-Pointer type maps, deterministic bytes/hashes, and the accepted
  4 MiB per-document bound. Preserve units, strings, array order/multiplicity, signed/zero amounts,
  ratios, null/unavailable fields, and sanitized provenance. Reject unsupported/malformed input;
  no numeric coercion, truncation, lexicographic amount ranking, or financial recomputation in SQL.
- Implement collection roots, parented observation versions, immutable analysis cores/source
  references, analysis attachments, and first terminal invalidation witnesses. Preserve shared
  quote/leg references and all 36 terminal rows, including partial/rejected/cancelled outcomes.
  Enforce immutable core equality, complete history prefixes, clock-invalid monotonicity, and
  same-observation/analysis ancestry. Preserve distinct runs and genuine repeated equal events.
- Supply narrow store operations for collection, initial analysis, revalidation, exact-version
  retrieval, and bounded observation/analysis metadata lists. Use the accepted keyset cursors,
  origin/parent filters, and page bounds. Return historical retrieval context plus original
  origin/as-of evidence and known invalidation; do not expose restored objects as live inputs.
- Use atomic `BEGIN IMMEDIATE` bundles at the three accepted write points, with serialization
  before the transaction and no network awaits inside it. Check exact prepared identities/bytes
  for retries and conflicts; never replace evidence. A witness invalidates all older branches of
  that observation without rewriting their documents or banning a fresh collection ID.
- Implement saved/not_saved/unknown acknowledgement, fixed sanitized reasons, rollback/closure,
  and at most one fresh read-only reconciliation by stable prepared IDs. A partial bundle is not
  a saved analysis. Do not retry collection, loop on writes, or claim exactly-once/crash-resume.

### 3. Integrate the existing one-shot CLI

- Keep collection/analysis producers and domain/protocol calculations independent of database
  ownership. Integrate the backend store lifecycle into the existing CLI flow through shared
  backend operations; no import-time opening, duplicate calculation authority, or new process.
- Implement ADR-0007's default persistence for both existing modes and **cli-v2** text/JSON output.
  Add independent persistence status/reason, confirmed version IDs, acknowledgement time, and known
  invalidation witness. Keep numeric diagnostics and market-state meaning separate from save
  status. Never print database paths, RPC URLs/keys, raw provider diagnostics, SQL, or exceptions.
- Validate help/arguments/market configuration before opening storage; initialize before RPC.
  Save collection before analysis and stop before analysis if that save fails. Save complete
  analysis and any later renewed attachment atomically at their respective write points.
- Recompute eligibility after the last save, with the accepted one-renewal/save limit and stored
  invalidation overlay. Elapsed storage time can make a saved result unusable; do not extend
  freshness/quote deadlines or fabricate validation events. On cancellation, retain confirmed
  saves and make at most the accepted terminal save attempt when storage is usable.
- Apply exits 0 for usable **and saved** evidence/help, 1 for unusable/runtime/save failure or
  uncertainty, 2 for usage/configuration errors before database/network I/O, and 130 for
  interruption. Verify actual signal handling after synchronous SQLite returns; no hard latency
  guarantee is introduced.
- Update root README/help, `.env.example`, the analysis guide, engineering/current-state/task
  evidence, and affected CLI/process tests for implemented behavior. Preserve cli-v1 archives as
  unchanged historical evidence. Fixture mode stays offline and needs no valid live credentials.

### 4. Validate and hand off

Add meaningful codec/store/CLI tests under the existing Node/Vitest setup. Existing CLI unit and
subprocess tests currently use the repository root: give every analysis test its own temporary
database path, including SIGINT; default-path resolution checks use temporary roots. Running the
suite must not create or alter the normal evidence files. Keep actual native-file tests distinct
from injected failures.
Record the exact candidate, host/runtime/driver/engine, effective settings, commands, and results.
Complete the planned checks below and disclose skipped/unverified external or hardware behavior.
Do not start M1-11 after delivery.

## Outside scope

- HTTP/history commands, API/SSE/browser UI, daemon/collector leases, service startup, or background
  scheduling; these remain M1-11/M1-12. The read/list API is backend-only for now.
- New chains/providers, fallback gateways, quote/admission changes, gas/net-cost producers,
  wallets, execution transactions, Anvil, or fork simulation.
- WAL/checkpoint management, retention/deletion, backup/restore/repair, archive import/backfill,
  historical replay, exports, future schema upgrades, other stores, or storage benchmarks.
- Runtime/toolchain upgrades, generic database/event-sourcing frameworks, workers/services,
  arbitrary install-script trust, cloud/CI/deployment, commits, or pushes without a separate request.

## Decisions and open questions

ADR-0007's driver, representation, limits, lifecycle, migration, and CLI changes are accepted.
This scope does not reopen those choices. File/module names, the narrow facade, statement layout,
and safe test seams are routine implementation choices within the approved design.

Native loading, exact engine provenance, available-host compatibility, effective PRAGMAs, schema
behavior, codec round trips, and save/fault/process behavior are **unverified gates**, not design
passes. Review current official documentation for the pinned package before installing it. Report
missing prerequisites or material deviations explicitly; do not substitute a driver/runtime or
weaker durability setting. Broader platform support and power-loss durability are not inferred
from a successful local run.

## Acceptance criteria

- [ ] The user explicitly approves this M1-10 implementation scope.
- [ ] The exact native dependency loads on the pinned backend runtime; loaded engine/source ID,
  effective settings, installation constraints, and clean frozen-lockfile setup are recorded.
- [ ] Fresh/current/concurrent initialization is correct and atomic; schema identity, constraints,
  immutable triggers, migration checksum, and unsupported-file/version protections are verified.
- [ ] Exact typed evidence survives real-file reopen, including large/signed values, string versus
  bigint, units, zero versus unavailable, all rows, sanitized provenance, and malformed-input rejection.
- [ ] Shared-observation analyses and revalidation branches preserve original cores, complete
  histories and dependencies; terminal invalidation applies across older branches without overwrite.
- [ ] Atomic bundles, exact retries/conflicts, and definite/uncertain failure states behave as
  specified; no partial acknowledgement, orphan, destructive fallback, or false saved claim occurs.
- [ ] Bounded historical reads preserve original origin/as-of state, linked evidence and stable
  cursor membership/order; restored clocks/flags never establish current live admission.
- [ ] The CLI implements default persistence, cli-v2, save/exit/cancellation semantics, and post-save
  eligibility without weakening financial/state policies; tests isolate all files and owned processes.
- [ ] S01–S08, the existing offline suite/toolchain checks, and fixture/process validation pass;
  actual live smoke results or an explicit external-validation limitation are recorded. Injected
  failures are identified separately from native/OS results; no hardware durability claim is inferred.
- [ ] User-facing documentation, task evidence, backlog/current state, links/anchors, and credential
  checks reflect the actual result; M1-11 and later work have not started.

## Planned validation

This implements [M1-09's S01–S08 matrix](M1-09-minimal-sqlite-design.md#proposed-validation-scenarios)
under [ADR-0007's criteria](../adr/0007-minimal-sqlite-evidence-store.md#acceptance-and-validation-criteria).
These are planned checks; none has run for M1-10.

| Case | Required evidence |
| --- | --- |
| S01 — exact round trips | Real-file write/close/reopen for uint112/uint256-scale amounts, ratios exceeding uint256, signed/zero gross, units, numeric-looking strings, escaped pointer keys, null/unavailable costs; reject malformed/duplicate/missing type paths, unsupported values and oversize documents |
| S02 — identity/history | Two analyses of one observation, divergent/shared prefixes, repeated equal events and no-op renewal; retain quote/row dependencies and original documents, reject changed numeric core/cross-parent references/cleared clock-invalid, and expose a terminal witness on every older branch |
| S03 — atomic bundles | Collection failure with null chain/block/registry, complete and rejected/partial/cancelled analysis, renewed attachments; force failures at insertion/commit boundaries and verify no partial bundle or acknowledgement, with foreign-key/integrity checks |
| S04 — duplicates/conflicts | Stable prepared IDs on exact retries; original metadata returned on deduplication; incompatible same-ID content rejected; one reconciliation distinguishes confirmed commit, confirmed absence, and unresolved unknown without new RPC/writes |
| S05 — operational faults | Real temporary-file lock contention and timeout, read-only writes, invalid paths/files and corruption; provoke SQLITE_FULL in an isolated page-limited test database. Inject I/O/commit/rollback errors for deterministic status coverage and label those simulations. Kill only an owned child at a synchronized uncommitted-write barrier and verify reopen behavior; no host disk filling or power-loss claim |
| S06 — restart/history | Separate-process reopen of original, failed and invalidated evidence; original live/historical/fixture provenance preserved, no revived live eligibility; exact ID reads and bounded keyset pages remain complete/stable with concurrent insertion and separately changing invalidation knowledge |
| S07 — migration | Fresh/repeated/concurrent initialization, immutable constraints/triggers, app/version/checksum and effective settings; failed initialization rollback, foreign/nonempty/future/altered schemas and unexpected journal mode preserved, with no reset/conversion |
| S08 — integration/ownership | Actual native host/engine verification, fixture text/JSON, no DB/network on help or invalid market config, failure before RPC/analysis, saved/unusable/unknown exits, SIGINT and owned closure, elapsed save expiring eligibility, concurrent CLI invocations, test-file isolation, and no credential/raw-diagnostic leakage in rows or output |

Run focused Node/Vitest checks while implementing, then `bun run check` for the final candidate.
Verify `bun install --frozen-lockfile` and native loading in an isolated copy of the candidate with
no private configuration, reused node_modules, or existing database; keep generated files local.
Use temporary local files and owned child processes for restart/lock/interruption checks. Fault
seams must stay narrow and must not become user-facing bypass flags or a second store framework.

After offline checks, perform bounded read-only live CLI text/JSON smoke checks with the existing
private Ethereum endpoint and a dedicated ignored evidence database. Confirm saved records after
reopen and report their actual as-of state; current market qualification/profit is not required
to prove persistence. No new provider, transaction, or public credential disclosure is authorized.
If live access is unavailable, record the reason and integration gap; constructed transports are
not live evidence. Physical disk failure, true power loss, other-platform compatibility, and
performance remain unverified unless separately scoped and exercised.

## Approval record

- Design acceptance: ADR-0007 accepted on 2026-11-18 with “i accept adr7”; its approval record
  owns the accepted decision. Earlier ADRs retain their own acceptance records.
- Scope preparation: On 2026-11-18 the user said “prep m1-10”. This authorizes this task record,
  relevant documentation links/current state, and read-only inspection.
- Implementation approval: **Not granted.** Preparation and ADR acceptance do not authorize
  dependency installation, code/tests/configuration changes, SQL, or opening any SQLite database.
- Commit-only authorization: After preparation, the user said “commit” on 2026-11-18. This
  authorizes the nine documentation changes covering ADR-0007 acceptance and M1-10 preparation;
  it does not approve implementation or a push.

## Evidence and handoff

Prepared on 2026-11-18 at HEAD `8360629`. Existing uncommitted ADR-0007 acceptance updates are
preserved. Read-only inspection covered the accepted design and S01–S08 handoff, requirements,
workspace/dependency/scripts/typecheck/Vitest setup, backend producer/CLI/configuration boundaries,
CLI/process test ownership, `.env.example`, ignore patterns, and deployment/workflow constraints.
The test-isolation issue above follows directly from the current CLI tests' shared repository root;
no test or store implementation has been created to address it during preparation.

No dependency was installed, no SQLite module/connection was opened, and no code, tests, runnable
migrations, configuration, or live RPC ran for preparation. Its documentation commit was separately
requested after handoff; no push is authorized. The historical M1-07
158-test result and M1-09 paper checks are not M1-10 test results. Actual implementation/native/
database/process checks above remain unexecuted.

At preparation handoff, checks passed across **39 Markdown files, 399 local links/anchors, and 149 requirement
references**, including whitespace/final newlines and `git diff --check`. The task is Proposed,
all ten implementation criteria are pending, S01–S08 occur once in the validation matrix, ADR-0007
remains Accepted, and no M1-11 task was created. Exactly nine expected Markdown files are changed
relative to HEAD, including the preserved acceptance updates; nothing is staged. HEAD remains
`8360629`; lockfile/brand SHA-256 values are unchanged. Source, tests, manifests, configuration,
and archived evidence are unchanged. A scan of all nine changed documents found no configured
endpoint or detected environment credentials.

The next action is review/approval of this scope, not automatic implementation.
