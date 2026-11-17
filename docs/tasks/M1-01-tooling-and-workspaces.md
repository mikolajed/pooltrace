# M1-01: Tooling and workspace foundation

- State: Proposed
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0002](../adr/0002-typescript-first-and-measured-evolution.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md)
- Requirement IDs: Tooling and boundaries in [ENGINEERING.md](../ENGINEERING.md)
- Depends on: User review of this task and explicit implementation approval; ADR-0001 is accepted

## Outcome

A minimal, reproducible TypeScript development foundation using Bun for dependency management and
project commands for the local UI/backend applications, ready for separately approved registry,
quotation, minimal persistence, and UI/API work.

## Scope

If approved, implement the accepted initial workspace structure, select supported tooling versions,
and add runtime/tooling configuration, dependency declarations and lockfile, basic configuration
guidance, `.env.example`, and documented commands. Check current official documentation when
selecting versions and APIs.

This task is narrower than M1. Approval for this foundation would not authorize pool adapters,
arithmetic/cycle logic, a market-data CLI, contracts, persistence, or UI/API behavior. Those now
include separate M1 implementation items under ADR-0004, not automatic extensions of this task.

## Outside scope

Protocol/domain implementation, behavioral test suites, deployment-address selection, live RPC
collection, fork execution, logo production, and all later milestones. Create later packages only
when needed by approved work; do not fill the repository with speculative placeholders.

Rust/Python implementation, language-bridging infrastructure, and a benchmark harness are also
outside this foundation task. The initial application is TypeScript under ADR-0002.

## Decisions and open questions

ADR-0001 is accepted as of 2026-11-17: workspace boundaries and a Node.js worker runtime with Bun
package management/commands are selected. Supported versions and concrete tooling configuration
remain to be selected during approved implementation. ADR-0004 selects local UI/backend process
separation, backend-owned early SQLite, and on-demand Anvil later; it does not approve this task's
implementation.
Future migration and CI/CD intent do not expand this task's scope.

## Acceptance criteria

- [x] User has accepted the design in ADR-0001.
- [ ] User has explicitly approved this implementation scope.
- [ ] Runtime and supported tooling versions are documented with authoritative references.
- [ ] Dependencies install reproducibly using Bun and its lockfile.
- [ ] Documented setup/check commands work for the foundation without implying a working scanner.
- [ ] Configuration guidance keeps real credentials out of Git.
- [ ] No unrelated domain, protocol, executor, database, or UI implementation is included.

## Planned validation

Inspect the resulting boundaries and dependency graph, run the approved installation/configuration
checks, and verify the documented commands. Do not create dummy behavioral tests simply to claim a
passing suite. This task needs no live RPC or fork verification.

## Approval record

- Design acceptance: Workspace/runtime accepted in ADR-0001 on 2026-11-17; TypeScript-first
  direction accepted in ADR-0002; local topology/early persistence direction accepted in ADR-0004.
- Implementation approval: Not granted.
- Approved scope and user instruction: None recorded.

On 2026-11-17 the user said “i accept adr 1, now reading m1”. This accepts the design while
leaving this task under review; it does not authorize implementation.

## Evidence and handoff

Implementation has not started. No code, manifests, dependency installation, or runtime checks for
this proposed task exist. After approved completion, record implementation evidence here and update
the backlog and current state.

Design acceptance recorded on 2026-11-17:

- Updated ADR-0001, its index, this task, and current documentation to reflect the accepted design.
  Added subsequent-decision notes to ADR-0002/0004 while preserving their original approval records.
- Local-link verification passed across 26 Markdown files; `git diff --check` passed.
- Approval-state checks confirmed ADR-0001 is Accepted and M1-01 remains Proposed with implementation
  approval not granted. Changed-file inspection found 11 Markdown files only and no untracked files.
- Next action: await the user's review and explicit implementation approval for M1-01.
