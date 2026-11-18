# M1-10: Minimal SQLite evidence store

- State: Done
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
opening/creation are authorized by the implementation approval recorded below.

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

- [x] The user explicitly approves this M1-10 implementation scope.
- [x] The exact native dependency loads on the pinned backend runtime; loaded engine/source ID,
  effective settings, installation constraints, and clean frozen-lockfile setup are recorded.
- [x] Fresh/current/concurrent initialization is correct and atomic; schema identity, constraints,
  immutable triggers, migration checksum, and unsupported-file/version protections are verified.
- [x] Exact typed evidence survives real-file reopen, including large/signed values, string versus
  bigint, units, zero versus unavailable, all rows, sanitized provenance, and malformed-input rejection.
- [x] Shared-observation analyses and revalidation branches preserve original cores, complete
  histories and dependencies; terminal invalidation applies across older branches without overwrite.
- [x] Atomic bundles, exact retries/conflicts, and definite/uncertain failure states behave as
  specified; no partial acknowledgement, orphan, destructive fallback, or false saved claim occurs.
- [x] Bounded historical reads preserve original origin/as-of state, linked evidence and stable
  cursor membership/order; restored clocks/flags never establish current live admission.
- [x] The CLI implements default persistence, cli-v2, save/exit/cancellation semantics, and post-save
  eligibility without weakening financial/state policies; tests isolate all files and owned processes.
- [x] S01–S08, the existing offline suite/toolchain checks, and fixture/process validation pass;
  actual live smoke results or an explicit external-validation limitation are recorded. Injected
  failures are identified separately from native/OS results; no hardware durability claim is inferred.
- [x] User-facing documentation, task evidence, backlog/current state, links/anchors, and credential
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
- Implementation approval: Granted on 2026-11-18 with “i accept m1-10”, after scope preparation
  commit `07660ec`. This authorizes the bounded installation, code/tests/configuration, SQL,
  database, and validation work above. It does not authorize later tasks, commits, or pushes.
- Commit-only authorization: After preparation, the user said “commit” on 2026-11-18. This
  authorizes the nine documentation changes covering ADR-0007 acceptance and M1-10 preparation;
  it does not approve implementation or a push.
- Completion commit authorization: After implementation handoff, the user said “commit” on
  2026-11-18, authorizing the 29 M1-10 implementation/test/configuration/documentation/report
  changes. This does not authorize M1-11 or a push.

## Evidence and handoff

### Preparation history

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

At preparation handoff the next action was scope review; the user subsequently approved M1-10
as recorded above. The following section owns actual implementation evidence.

## Implementation evidence

Completed on 2026-11-18 from base commit `07660ec`; changes were uncommitted at implementation handoff.
No commit/push or later task was authorized by the implementation approval.

### Delivered behavior and provenance

- [Driver facade](../../apps/backend/src/storage/driver.ts),
  [codec](../../apps/backend/src/storage/codec.ts),
  [producer-shape validation](../../apps/backend/src/storage/evidence.ts),
  [schema](../../apps/backend/src/storage/schema.ts), and
  [store](../../apps/backend/src/storage/store.ts) implement ADR-0007's six tables, immutable
  versions/cores, exact type-map encoding, atomic saves, conflict/idempotency handling, terminal
  witnesses, bounded metadata lists, and exact historical retrieval. Public historical values
  are deliberately unknown-typed evidence, with explicit false live admission and null current
  best; they do not silently satisfy the live producer API types.
- [CLI integration](../../apps/backend/src/cli-runner.ts) supplies default live/fixture persistence
  and cli-v2 with independent status, current confirmed IDs, original collection ID, last confirmed
  analysis ID, acknowledgement time, and invalidation witness. This preserves prior saved evidence
  after a failed/uncertain renewal. Failed integrity reads withhold admission/best without erasing
  an already confirmed commit. Closed/failed handles cannot be reused through store operations.
- Bun installed exact better-sqlite3 **13.2.0** in the backend; other runtime/toolchain pins are
  unchanged. The actual native binary loads on **macOS arm64 / Node 26.3.1 / Bun 1.3.11** and
  reports **SQLite 3.54.1**, source ID
  `2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76`.
  Actual compile options included THREADSAFE=2, DEFAULT_FOREIGN_KEYS, and DQS=0; STRICT and JSON
  constraints executed successfully. Package/native loading needed no added trusted install script.
  The tagged package/API/constructor references linked in ADR-0007 were rechecked on 2026-11-18.
- Initialization and reconciliation verify DELETE, EXTRA=3, foreign_keys=1, trusted_schema=0,
  busy_timeout=500 and safe integer reads. New directories/files use 0700/0600; existing files
  retain permissions. A read transaction makes initial identity inspection consistent before
  initialization rechecks identity under BEGIN IMMEDIATE. Existing journal modes are not coerced.
- Version-1 migration SHA-256 is
  `da95bf7806773dcee32f47b3bd01e32687cab8c1b55a2e8dbf15e39687e5efcc`.
  The ledger records real runtime/driver/engine/source identity. No version-2 migration, reset,
  backfill, retention, archive import, or backup/restore was implemented.
- README/help, `.env.example`, ignore patterns, analysis/engineering/deployment/navigation/current
  state, and affected tests describe implemented behavior. Existing domain/protocol calculations,
  snapshot/analysis producers, toolchain pins, and earlier evidence archives remain unchanged.

### Actual validation

[Storage tests](../../apps/backend/test/storage.test.ts) add **47 cases**. Existing
[CLI tests](../../apps/backend/test/cli.test.ts) were updated for cli-v2 and temporary roots/files;
the owned [storage subprocess](../../apps/backend/test/storage-process.ts) exercises process
boundaries. A separate test preload exercises SIGINT queued during an actual synchronous database
lock; the CLI yields after storage/error handling before deciding cancellation/eligibility.
Together with the prior suite, the final result is **205 passing tests / nine files**.

| Case | Executed evidence |
| --- | --- |
| S01 | Exact codec BigInt/string/null/zero/signed/extreme ratio and pointer-key cases; malformed/missing map and unsupported/oversize rejection; real-file typed analysis and large signed diagnostics after reopen |
| S02 | Two analyses sharing one source, divergent histories, repeated equal events, no-op attachment, old-document preservation, terminal witness on all old branches and later good branch, fresh collection unaffected; immutable-core and parent/history conflicts rejected |
| S03 | Null-chain/block/registry failed collection; failed/cancelled 36-row analyses; real SQL trigger failure mid-analysis rolls back its core/new observation version while retaining prior collection; FK/integrity checks pass |
| S04 | Stable duplicate/no-op IDs and original row metadata; conflicting immutable payload rejected; injected pre-/post-commit and failed-rollback outcomes reconcile exact committed targets or absence, while failed reconciliation stays unknown |
| S05 | Real read-only write error, page-limit SQLITE_FULL, incompatible/corrupt files, 500 ms writer-lock timeout, and killed owned writer followed by integrity/reopen verification. I/O/commit/rollback uncertainty used explicit boundary injection, not physical device failure |
| S06 | Typed real-file and separate-process analysis reload, original provenance, historical context with no current admission/best, bounded string cursors, concurrent insertion excluded from later pages, and retained known invalidation |
| S07 | Actual STRICT/FK/immutable triggers, repeated/concurrent process initialization, forced initial-DDL rollback and clean retry, preserved future/foreign/altered-checksum/schema/WAL/corrupt files |
| S08 | Host native/engine verification; help/config before DB/network, initialization before RPC, collection-save failure before analysis, usable calculation with unknown save, real Bun/Node SIGINT during RPC and queued during a synchronous database lock, owned cleanup, isolated files, save latency expiring final eligibility with only one renewal/save, read-integrity failure retaining confirmed save while withholding admission, and credential absence in real rows/output |

Commands/results:

- `bun run check` passed toolchain, strict typechecking, lint, formatting and all 205 tests in the
  working candidate. A prior 202-case pass was extended with final integrity/error-path guards.
- `bun install --frozen-lockfile` installed **114 packages** in an isolated candidate copy without
  `.env`, `.env.local`, reused node_modules, or any database. Relevant process configuration was
  unset for verification. The final formatted candidate was refreshed into that copy and
  `bun run check` passed **205/205**, including native-file/process cases. No default `data/`
  directory was created by the suite. No extra native install-script trust was introduced.
- Intermediate type/format failures and two mistaken test expectations were corrected before
  the final pass. Numeric-looking strings are valid strings without a BigInt path; missing type
  information is rejected by producer-shape/hash validation. Broken quote relationships fail
  encoding validation before a conflicting-source transaction is attempted. A clean-copy check
  initially used pre-format files; refreshing the formatted candidate resolved that failure.

### Actual live evidence

Approved read-only commands used the existing private endpoint and a dedicated ignored
`data/m1-10-live.sqlite` file; no execution transaction, alternate provider, or new chain was used:

- `POOLTRACE_DB_PATH=data/m1-10-live.sqlite bun run cli --mode live --format json`: exit 0,
  as-of **2026-11-18T17:26:36.883Z**, block **26443434**, observation
  `564e2f1a-55fb-4660-a969-c3a7a3d979d2`, analysis `cec0e043-c449-4aa4-8817-fa66a2349b8d`.
  [Archived JSON](../evidence/M1-10-cli-live-2026-11-18.json) records cli-v2, usable/saved,
  36 qualified outcomes and as-of live admission. Best tested gross was **−0.032502 USDC**;
  full-transaction costs/net profit remained unavailable.
- `POOLTRACE_DB_PATH=data/m1-10-live.sqlite bun run cli --mode live`: exit 0, as-of
  **2026-11-18T17:26:53.615Z**, block **26443435**, observation
  `aeab35fe-4a8c-4923-88c8-8ad67954363d`.
  [Archived text](../evidence/M1-10-cli-live-2026-11-18.txt) records usable/saved and 36/36
  qualified comparisons; the best tested gross was again −0.032502 USDC with costs/net unavailable.
- Closing/reopening the file confirmed two analyses, exact serialized equality of the JSON run's
  stored analysis, and retrieval of the text run's confirmed revision. Both historical DTOs deny
  current admission. The archived text/JSON describe past as-of events, not continuing eligibility.
  These live smoke runs preceded the final error-path regression guards; the final offline/clean
  checks cover those guards, and financial/RPC producers were unchanged.

Reports were scanned for the configured endpoint/key before archiving. JSON was subsequently
formatted with Biome without changing parsed evidence; text remains the actual command output.
Existing M1-03/M1-05/M1-06 reports were preserved.

### Remaining limits and handoff

The 500 ms limit covers lock waiting, not arbitrary filesystem or SIGINT latency. Failure
injection is distinct from real SQLite/OS cases; actual disk failure, true power loss, other-platform
compatibility, backup/restore, and capacity/performance are unverified. A crash before saving can
lose an in-memory result, and there is no RPC queue/crash-resume service. History reads are
backend-only; no history command, HTTP/SSE, browser UI, daemon, or later schema/retention feature
was added. No formal proof, execution/fork result, positive net-profit, or capture claim follows.

Final documentation checks passed across **39 Markdown files, 415 local links/anchors, and 149
requirement references**, including whitespace/final newlines and `git diff --check`. All ten
criteria are complete. Exactly **29 files** changed within implementation/tests/configuration,
documentation, and the two new actual report archives. Source/lock identity with the clean-tested
candidate was verified; its private configuration/default data paths remain absent. A scan of all
changed files found no configured endpoint or detected environment credentials. Domain/protocol
and existing snapshot/analysis/configuration producers, toolchain pins, earlier report archives,
and the supplied brand reference are unchanged. The updated Bun lockfile SHA-256 is
`f23e411db273b8b5f8acb3f074528155de586fb6dedf75b2a66d1dbedf10c6db`.

At implementation handoff HEAD was `07660ec`, nothing was staged, and no implementation commit
or push had been created. The user subsequently requested the completion commit recorded above.
Next proposed work is M1-11 scope preparation when requested; it has not been prepared or started.
