# Current state

Updated: 2026-11-17.

## Phase and authorization

**M1-02 design task is complete. ADR-0005 is Proposed; M1-03 implementation is not approved.**

The user approved M1-01 and subsequently M1-02 on 2026-11-17. Both bounded tasks are complete.
M1-02 authorized official-source research, a proposed ADR, and an implementation-validation plan.
Subsequent application, database, pipeline, and infrastructure work remains separately gated.
[WORKFLOW.md](WORKFLOW.md) defines the approval process; individual task records hold implementation
authorizations when they exist.

## What exists

- Project introduction, documentation map, product scope, correctness requirements, engineering
  conventions, and approval workflow.
- Roadmap, backlog, task template, documentation task evidence, and completed M1-01 evidence.
- Completed [M1-02 evidence and an M1-03 validation plan](tasks/M1-02-registry-and-consistent-snapshots.md).
- Proposed [ADR-0005](adr/0005-registry-verification-and-consistent-snapshots.md) for source-backed
  candidates, hash-bound collection, admission stages, freshness/failures, and provenance. No
  pool address, liquidity, provider capability, or runtime integration was verified through RPC.
- ADR workflow/template and accepted ADR-0001 for workspace boundaries, a Node.js backend runtime,
  and Bun tooling.
- A private root Bun workspace foundation, generated lockfile, Node.js/Bun version pins,
  TypeScript tooling script and strict settings, Biome checks, `.env.example`, and setup guidance.
  Exact versions and references are recorded in [ENGINEERING.md](ENGINEERING.md#foundation-toolchain).
- Accepted ADR-0002 for the TypeScript-first language direction and benchmarking intent.
  Concrete future migration designs remain open.
- A draft benchmark methodology and future EVO/BENCH backlog items; no benchmark runs or results.
- Accepted ADR-0003 for SQLite initially and future storage options, with timing/write ownership
  refined by accepted ADR-0004. The minimal M1 schema/driver and future STORE/BENCH designs remain open.
- ADR-0004 selects local UI/backend processes, minimal SQLite in M1, and on-demand Anvil in M2.
  A deployment/environment plan records future CI/CD gates; no pipeline or host is configured.
- The unchanged perched kingfisher reference; production assets remain backlog work.
- Basic ignore and editor configuration.

## What does not exist yet

No backend/frontend/domain/protocol application packages, market-data CLI, executor, database,
terminal, or behavioral test suite. No live RPC, fork verification, or benchmark has been performed.

## Next proposed action

Review [ADR-0005](adr/0005-registry-verification-and-consistent-snapshots.md), especially strict
hash/canonical reads and the proposed boundary between structural screening and finite-size
liquidity admission. Then prepare/review a bounded M1-03 implementation task. ADR acceptance and
M1-03 implementation approval remain separate; M1-03 has not started.

The [backlog](BACKLOG.md) owns the work inventory. This summary is a handoff aid, not permission
to start the next task.

## Latest handoff

The user's M1-01 commit `5cd1acb` is present. M1-02 research and documentation are complete, with
primary-source links and a planned offline/live validation matrix. M1-02 records actual checks
and limitations. Only documentation changed; no implementation, dependency installation, live RPC,
commit, or push was performed. ADR-0005 remains Proposed for review.
