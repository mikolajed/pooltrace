# M1-11: Local API, SSE updates, and minimal read-only browser

- State: Proposed
- Milestone: M1 — local read-only research application
- Related ADRs: proposed [ADR-0008](../adr/0008-local-api-sse-and-process-interface.md);
  accepted ADRs [0001](../adr/0001-project-boundaries-and-tooling.md),
  [0004](../adr/0004-local-processes-and-gated-deployment.md),
  [0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [0006](../adr/0006-quotation-cycles-and-profitability.md),
  [0007](../adr/0007-minimal-sqlite-evidence-store.md)
- Requirement IDs: CR-01 through CR-06, CR-09, CR-10, CR-11 in [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: completed M1-01–M1-10, acceptance of ADR-0008, and explicit implementation approval
- Related task: [M1-12](M1-12-local-startup-readiness-and-shutdown.md); its launcher consumes this
  task's process interface, but this task's individual applications must work independently

## Outcome

One local backend continuously produces bounded read-only analysis attempts and owns SQLite, API,
and SSE. A separate minimal browser application shows current as-of results and exact historical
evidence with honest expiry, origin, failure, and save states. Refreshing or reconnecting the browser
does not create or restart collection. This document prepares a reviewable implementation scope;
application code, executable contracts, scaffolding, tests, and dependencies are not created here.

## Scope

### 1. Backend service and producer ownership

- Add a Node service entrypoint, validated service configuration, and one scheduler over existing
  snapshot/analysis/storage behavior. Implement ADR-0008's explicit live/fixture mode, serial
  completion-delay scheduling, cancellation, and unchanged per-attempt RPC/quotation budgets.
- Implement the shared per-database producer guard in the service and existing standalone CLI.
  A competing entrypoint fails clearly before storage/RPC work. Preserve existing cli-v2 output,
  mode/size parsing, save semantics and exit meanings; document the new ownership failure. Test
  guard acquisition races, symlink aliases, release, and fail-closed crash leftovers on temporary data.
- Preserve collection-save-before-analysis, atomic version saves, confirmed/failed/uncertain
  acknowledgement, terminal invalidation, and post-save eligibility. At publication use at most
  the existing bounded renewal/save path; do not add a perpetual renewal loop or revive expiry.
- Keep no restored current admission after restart. Fatal storage/ownership failure stops the
  scheduler and withdraws readiness; market/RPC failure remains an operational, visible state.
- Implement individual backend readiness and graceful shutdown. These belong here, not in the
  launcher. Stop scheduling, cancel work, retain confirmed evidence, close owned handles, and
  release the producer guard last. Synchronous storage has no hard interruption guarantee.

### 2. Read API and bounded SSE

- Implement only ADR-0008's versioned current, bounded historical lists, exact revision details,
  event stream, and `/healthz`. Reuse current store operations/cursors and exact serialization;
  validate routes, query lengths/values/IDs, method, Host, Origin, and response/work limits.
- Keep read requests free of RPC/collection side effects. Current responses use current backend
  clocks/invalidation; historical responses retain historical context and cannot become live inputs.
  Preserve origins, all 36 outcomes, units, signed gross, metric, timestamps, block identity, save
  status, unavailable cost/net, and distinct known-zero values. Never reveal secrets or local paths.
- Implement bounded status-only SSE projections with instance/sequence identities, initial and
  reconnect resynchronization, one-second local status ticks, slow-client backpressure/cleanup,
  connection limits, no durable replay promise, and no per-client backend computation authority.
- Keep storage schema/driver/settings unchanged. This task adds service/API ownership, not broader
  evidence-query indexes, migration machinery, recovery, retention, or exports.

### 3. Minimal browser application and individual launch commands

- Add `apps/web` using the selected Next.js/React direction with a minimal readable layout and
  browser/JSX TypeScript configuration. Research exact compatible frontend dependencies from
  official sources before approved installation. Record pins and constraints; keep existing
  runtime/toolchain pins and defer component libraries/rich terminal styling unless needed by scope.
- Render service/connection/save state, fixture banner, 36 route/size rows, exact gross amounts,
  best tested gross when eligible, unavailable cost/net, provenance/age, bounded history lists,
  and exact revision detail. Distinguish current as-of verdict from historical ranking/diagnostics.
- Cover initial/no-results, no-positive-gross, partial/rejected, unavailable, stale, invalidated,
  disconnected, and historical views. Remove current presentation on stream error/silence or
  validity expiry and after suspended-page resume until fresh server evidence is received.
- Use browser-native EventSource and coalesced current-view fetches; discard older responses by
  instance/sequence. No browser RPC, SQLite access, backend runtime imports, authoritative financial
  recalculation, simulation controls, or execution controls.
- Implement uncached web readiness plus the individual `dev:backend`/`dev:web` commands and their
  fixed Node entry points/arguments, public runtime `/api/config`, and process semantics from
  ADR-0008. The web bootstrap owns Next child signal/exit forwarding without detaching descendants.
  Update root scripts, manifests, Bun lockfile, checks and configuration for the implemented apps.

### 4. Validation and documentation

Add meaningful Node/Vitest API/service/process checks and proportionate browser validation. Extend
the root checks to cover actual web/JSX source and an application build. Use isolated temporary
files, ports, and processes; tests never touch normal evidence files. Update implemented commands,
public configuration, analysis interpretation, engineering/runtime guidance, and task evidence.
Distinguish offline, real browser/process, and actual live RPC evidence. M1-12 validates the combined
launcher workflow separately; this task validates the individual applications.

## Outside scope

Combined supervisor implementation (M1-12); M4 charts/terminal/brand refinement; arbitrary API
mutations, manual collection buttons, RPC proxying, hosted auth/deployment, CI, containers,
additional providers/chains, financial/admission policy changes, gas/net-cost producers, wallets,
transactions, executor/Anvil, perpetual renewal, storage-format changes, retention/backup/recovery,
benchmarks, runtime upgrades, commits, and pushes. Scope is this milestone increment, not a
permanent product limitation.

## Decisions and open questions

ADR-0008 owns the proposed commands/configuration, producer guard, read/SSE semantics, state expiry,
process interface, application responsibilities, and integration gate. Both task scopes and design remain
proposed. Internal file names and ordinary implementation details can be resolved within approval;
the two Node entry paths/argv are fixed shared interfaces. A material process-interface, policy,
dependency/runtime compatibility, or scope change must be reviewed and reflected in dependent task
scope before dependent work proceeds.

Exact frontend pins and actual compatibility remain implementation research/validation gates;
they are not invented in this plan. Real browser automation tooling is not selected or installed
by this preparation. Use available browser tooling where sufficient; new dependencies must fit
the approved minimal scope with manifests and lockfile reviewed together.

## Acceptance criteria

- [ ] ADR-0008 is accepted and this specific implementation scope is explicitly approved.
- [ ] Individual backend/web commands run on the selected pins with documented configuration,
  identity/readiness, lifecycle and cleanup; RPC failure does not masquerade as process failure.
- [ ] Only one service/CLI producer owns a given canonical evidence file; concurrent and leftover
  ownership fails explicitly without competing collection, destructive cleanup, or credential leaks.
- [ ] One scheduler preserves accepted RPC/state/financial/save policies; browser count and request
  traffic do not create more collectors, revalidation work, or ownership authority.
- [ ] API current/history semantics preserve exact amounts, all outcomes, provenance, unavailable
  versus zero, origin, save acknowledgement and invalidation; restart/history never restores live admission.
- [ ] Bounded SSE/reconnect and delayed/out-of-order responses resynchronize correctly; slow clients
  remain bounded and eligibility visibly expires despite absent results, network loss, or page suspension.
- [ ] The minimal real browser view is readable/keyboard-usable and displays truthful current,
  diagnostic, historical, fixture, empty, negative, stale, incomplete and unavailable states.
- [ ] Full offline checks and the web build pass; actual process/browser/live results or explicit
  external-validation limits are recorded separately, with no fabricated market evidence.
- [ ] User documentation, task evidence, backlog/status and process interface match the result;
  M1-12 completion is assessed against its own real-application integration gate.

## Planned validation

These checks have **not run**. They become required evidence only after implementation approval.

| Case | Required evidence |
| --- | --- |
| A01 — ownership/lifecycle | Fresh missing database/parents, real isolated service-vs-service/CLI acquisition races and path aliases; valid release/restart; malformed/crash-left guard fails closed; cancellation during startup/collection/save preserves files and unrelated processes |
| A02 — one collector | Multiple browser/API/SSE clients, refresh/disconnect/reconnect, slow attempts and delayed ticks never overlap pipelines or increase per-attempt RPC work; configuration and fixture isolation verified |
| A03 — honest current/history | Initial empty state, exact large/signed/zero/null values, 36 rows, pagination under new inserts, exact version retrieval, known invalidation, saved/not_saved/unknown, history/restart with no restored live admission |
| A04 — expiry/failures | Controlled time/RPC/save and response/frame delivery delays, five-second validation expiry, block-age/clock faults, rejected/partial quotes and invalidation remove current best without changing numeric history or widening accepted policy; transport receipt never restarts validity |
| A05 — API/SSE limits | Invalid IDs/queries/method/Host/Origin, missing records/storage, output redaction, capacity limits, slow-client drain, bounded queues/connection cleanup, epoch changes and reconnect resynchronization |
| A06 — real browser | Actual backend/web in fixture mode; runtime connection config/mode mismatch, table/history, missing costs/net, keyboard/readability, refresh/reconnect, network loss, conservative expiry despite delayed delivery, suspension/resume and out-of-order responses; screenshots or other actual observed evidence |
| A07 — repository gates | `bun run check`, actual web build, frozen-lockfile clean installation/checks without private config, existing CLI regressions, isolated test artifacts; exact source/runtime/frontend pins recorded |
| A08 — actual live observation | Separate read-only live service/API/browser smoke against configured Alchemy, with temporary evidence file and sanitized actual reports; unavailable access is an integration limitation, never a fixture pass |

## Approval record

- Documentation preparation: Approved on 2026-11-18 by “ok do it”, following the recommendation to
  prepare both task scopes and their shared process interface for review.
- Design acceptance: Pending; see [ADR-0008 approval](../adr/0008-local-api-sse-and-process-interface.md#approval-record).
- Implementation approval: **Not granted.**
- Implementation scope approved by user: None recorded. Documentation preparation does not approve
  either task's implementation or the proposed ADR.

## Evidence and handoff

Documentation prepared on 2026-11-18 from requirements, accepted ADRs, and read-only source/design
review covering entry points, storage/history, and application lifecycle. Findings include the
CLI/service ownership gap, historical-data admission boundary, readiness identity, and M1-12's
real-app integration dependency.
No implementation, dependency installation, application launch, or runtime test occurred.
Follow-up design review found missing fixed launch parameters, fresh-path guard handling, and
transport-delay expiry details; the documents now specify them and the targeted rechecks found no
remaining material contradiction in those sections.

Documentation verification: `git diff --check` passed; an inline local Markdown target/anchor check
passed for **172 links across 11 changed/new documents**. Wording checks confirm the ADR and task
scopes describe technical responsibilities without implementation assignments. These are documentation checks, not
application tests. Full offline tests, build, installation, HTTP/SSE/process/browser and live checks
were not run for this documentation-only preparation. Official API research and its limitations
are recorded in ADR-0008. Next proposed action: review ADR-0008 and both scopes, then separately
authorize the desired implementation.
