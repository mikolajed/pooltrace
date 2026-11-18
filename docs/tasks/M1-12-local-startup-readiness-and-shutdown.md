# M1-12: Local startup, readiness, and shutdown

- State: Proposed
- Milestone: M1 — local read-only research application
- Related ADRs: proposed [ADR-0008](../adr/0008-local-api-sse-and-process-interface.md);
  accepted [ADR-0001](../adr/0001-project-boundaries-and-tooling.md) and
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md)
- Requirement IDs: CR-03, CR-09, CR-10; preserve financial/evidence requirements in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: accepted ADR-0008 and explicit approval of this task; real-app integration/completion
  also depends on [M1-11](M1-11-local-api-sse-and-browser.md)

## Outcome

One foreground Bun command starts the backend and UI with clear identity/readiness/failure status,
then shuts down only its owned applications and descendants. Individual application commands
remain usable. Read-only quotation and browser use require no Anvil. Controlled child processes
cover launcher failure cases; completion also requires validation with the actual applications.

## Scope

### 1. Narrow foreground launcher

- Add a pinned-Node launcher and focused process fixtures/tests under `scripts/local/**`, the root
  `bun run dev --mode live|fixture` command, and root check wiring.
  Use only built-in Node process/HTTP/time APIs and existing test tooling; add no external dependency.
- Implement ADR-0008's process interface as the sole lifecycle agreement: strict arguments,
  configuration precedence, explicit mode, distinct loopback ports, validated root-relative
  backend settings, nonsecret run identity, deadlines, readiness fields, and exits.
- Spawn fixed Node executable/argument arrays for M1-11's real entry points without a shell or
  nested Bun wrapper, with the repository root as cwd and ADR-0008's fixed `server.ts` / `dev.ts`
  paths, `--mode` argument, and named public environment keys. Give backend private configuration
  and give web only public local connection
  configuration/runtime essentials. Drain or safely bound child output; never log private values.
- Start backend, verify readiness while its owned child remains alive, then start web and verify
  its readiness/root response. Print useful local addresses and lifecycle state after actual
  readiness, without treating market qualification/profit/RPC success as operational readiness.
- Keep individual application start commands available through M1-11; launcher does not implement
  their collector, readiness route, per-app signal handlers, database lifecycle, or wire DTOs.

### 2. Failures, cancellation, and owned-process cleanup

- Handle spawn/bind failures, early child exit, readiness timeout/mismatch, invalid response,
  post-ready child failure, SIGINT and SIGTERM. Stop both owned apps and return the specified
  failure/signal exit; do not leave the healthy sibling silently running or claim launch success.
- Track only children/process groups created by this invocation. Do not adopt an existing
  service, kill a port owner, scan by process name, trust stale PID files, or alter unrelated
  processes. Identity-bearing readiness prevents an unrelated healthy listener satisfying startup.
- Request graceful stop, allow the fixed grace period, then escalate only remaining owned groups.
  Wait for actual process/stream closure and report incomplete cleanup. Handle repeated signals and
  startup cancellation idempotently. Initial process-group support targets the available macOS
  host; unsupported modes must fail clearly rather than use broad fallback termination.
- Keep the launcher in the foreground with no restart loop, daemon registration, background job,
  port substitution, database cleanup, dependency install, or automatic browser launch.
  Synchronous filesystem/SQLite work and uncatchable termination prevent a hard cleanup-time promise.

### 3. Integration and usage documentation

- Update root scripts/checks, `.env.example`, README, canonical documentation and task evidence
  for the implemented launcher. No dependency changes are needed for this task.
- Validate the real M1-11 applications once available, including actual Bun-to-Node signal
  forwarding, browser/API/SSE use, repeat startup, historical reopen, and owned-descendant shutdown.
  Do not duplicate app/service behavior in the launcher to satisfy tests prematurely.
- Document setup/start/stop, separate commands, process-readiness versus market status, configured
  ports/mode, failure/exit meanings, platform limits, and fail-closed producer guard leftovers.
  Detailed evidence-store recovery remains outside scope.

## Outside scope

M1-11 application/API/SSE/collector/browser implementation; alternate collector/database authority;
Foundry/Anvil/fork orchestration; financial/state policy changes; runtime upgrades; process-management
frameworks; cloud hosting, containers, service installation, CI/deployment, remote access, automatic
restart/recovery, port-owner termination, evidence deletion, other-platform support claims,
benchmarks, commits, and pushes.

## Decisions and open questions

ADR-0008 owns the exact process interface and application responsibilities. Its acceptance and this task's
implementation approval are separate gates. The launcher can be built/tested with controlled child
fixtures once approved; it must use the actual agreed application entry points at integration.
The application launch paths/arguments, cwd, public keys and web runtime configuration route are
specified in ADR-0008 and apply to both individual commands and the launcher. Material interface
deviations require review and updates to dependent scope before implementation. Ordinary internal
function/file choices remain within the approved scope.

Process groups and descendant cleanup need actual available-host evidence. A Node `kill` call
returning success is insufficient proof of exit. Windows/Linux behavior is not inferred from
macOS checks. If actual Next.js descendants cannot meet the ownership/cleanup contract, report the
gap and review the design rather than adding broad process searches or claiming fixtures suffice.

## Acceptance criteria

- [ ] ADR-0008 is accepted and this specific implementation scope is explicitly approved.
- [ ] One Bun command starts the actual M1-11 applications with correct configuration, isolated
  ownership and identity-bearing readiness; individual commands remain usable without Anvil.
- [ ] Invalid configuration fails before spawning; failed/mismatched/timed-out startup and child
  failure after readiness are clear, nonzero outcomes with sibling cleanup.
- [ ] Actual SIGINT/SIGTERM and repeated/cancel-during-start signals stop only owned applications
  and descendants; escalation and incomplete cleanup reporting match the agreed policy.
- [ ] Unrelated sentinel processes/listeners survive all relevant failure and signal checks;
  an occupied port never causes adoption, port substitution, or termination of its original owner.
- [ ] Fixture process tests, real Bun-to-Node process checks, and actual M1-11 integrated fixture
  workflow are recorded separately. Passing controlled processes alone cannot mark this task done.
- [ ] Full integrated repository checks/web build and frozen-lockfile setup pass; live smoke and
  platform/forced-stop limits are reported honestly. Tests isolate ports/evidence/owned processes.
- [ ] README/configuration/help, task evidence, backlog and status describe implemented behavior;
  no next milestone or deployment begins automatically.

## Planned validation

These are future checks, not executed results. Fixture child programs are created only after approval.

| Case | Required evidence |
| --- | --- |
| L01 — parsing/configuration | Missing/invalid/duplicate mode/options, equal/out-of-range ports, invalid delay/database/RPC config, fixture without credentials, root/file/process precedence and web environment allowlist; no spawn on invalid configuration |
| L02 — readiness/ownership | Delayed/missing/wrong role/version/run ID, malformed/oversize response, timeout, early exit, occupied port with unrelated healthy server; exact owned-child liveness and no false ready |
| L03 — failures/signals | Spawn failure, failure of each child before/after readiness, SIGINT/SIGTERM during startup and running, repeated signals and simultaneous exit/error; deterministic exit and sibling cleanup |
| L04 — descendants/escalation | Controlled child ignores graceful stop or starts descendants; bounded wait/escalation/actual closure on available host, no orphaned owned descendants, unrelated sentinel remains alive |
| L05 — actual entry points | Real `bun run dev --mode fixture` with temporary evidence/ports, matching readiness identities, real web root/API/SSE, multiple browsers/refresh/reconnect leave one collector, shutdown/restart succeeds, saved records reopen as historical |
| L06 — real runtime and limits | Actual Bun-to-Node signal chain and pinned runtime on available macOS host; forced stop leaves honest producer-guard limitations, no automatic stale-guard or journal deletion; other platforms explicitly unverified |
| L07 — combined candidate | `bun run check`, actual web build and clean frozen-lockfile installation/checks with M1-11 integrated; exact baseline/source/environment and actual results recorded |
| L08 — live workflow | Separate actual read-only live combined-start smoke with configured Alchemy and temporary evidence; real observation/save/status/shutdown, or explicit external-validation limitation, never substituted fixture evidence |

## Approval record

- Documentation preparation: Approved on 2026-11-18 by “ok do it”, after the recommendation to
  prepare M1-11/M1-12 scopes and their shared interface for review.
- Design acceptance: Pending; see [ADR-0008 approval](../adr/0008-local-api-sse-and-process-interface.md#approval-record).
- Implementation approval: **Not granted.**
- Implementation scope approved by user: None recorded. This preparation does not authorize a
  launcher, process fixture, package change, or application implementation.

## Evidence and handoff

Documentation prepared on 2026-11-18 alongside M1-11 and proposed ADR-0008, informed by read-only
source and design review. Actual baseline has Bun scripts invoking pinned Node, a one-shot CLI,
backend-owned storage, and no web or application startup scripts. The reviewed split assigns
application readiness/cleanup to M1-11 and process supervision to M1-12; final acceptance requires
the real applications. No implementation, installation, process launch, or runtime test occurred.
Follow-up read-only review identified missing exact launch parameters and fresh-path guard details;
both were resolved in ADR-0008 and targeted rechecks found no remaining
material contradiction in those sections.

Documentation verification: `git diff --check` passed; the shared inline Markdown target/anchor
check passed for **172 links across 11 changed/new documents**. Wording checks confirm technical
responsibilities are independent of implementation assignments. No process fixtures, app startup,
browser, build, dependency installation, offline application suite, or live check ran. Planned
L01–L08 evidence remains entirely pending. Next proposed action: review the shared ADR and both
scopes, then separately authorize implementation.
