# 0001: Project boundaries and tooling

- Status: Accepted
- Proposed on: 2026-11-17
- Decision accepted by user: 2026-11-17; workspace boundaries and Node.js runtime with Bun tooling
- Related task: [M1-01](../tasks/M1-01-tooling-and-workspaces.md)
- Related conventions: [ENGINEERING.md](../ENGINEERING.md)
- Supersedes / superseded by: None

## Context

Pooltrace is an ongoing product developed through individually scoped milestones. The architecture
should support continued growth and incremental delivery. The user requires ADR-driven development
and explicit approval before any implementation. Bun has been explicitly selected for package
management and project commands.

The original technology brief specifies TypeScript/Node.js, viem, Vitest, Foundry, SQLite, and
Next.js. Package management and worker runtime are separate choices.

The user has since selected a TypeScript-first application with planned, benchmarked backend
evolution, potentially using Rust and Python; that direction is accepted in
[ADR-0002](0002-typescript-first-and-measured-evolution.md). This record selects the initial
workspace layout and worker runtime, not a future multi-language process design.

[ADR-0004](0004-local-processes-and-gated-deployment.md) now selects two local application processes,
early SQLite, and later on-demand Anvil. The directory sketch below is updated to support that
decision. This record selects the workspace boundaries and Node.js backend runtime with Bun tooling.

## Decision

Use a small private Bun workspace repository with a committed Bun lockfile. Separate pure domain
logic, protocol interactions, worker orchestration, frontend, and Solidity contracts:

```text
apps/
  backend/         collection, analysis, persistence, API, CLI access
  web/             minimal UI in M1; richer terminal in M4
packages/
  domain/          pure amount arithmetic, cycles, result/provenance types
  protocols/       viem-backed registry verification and quote adapters
contracts/         Solidity executor and Foundry tests
docs/              requirements, ADRs, mathematics, evidence, and guides
```

These directories are the accepted target layout, not an implemented scaffold. Add each
application/package only when its implementation is approved. Avoid a monorepo orchestration
framework initially.

Keep the worker on Node.js as requested in the original brief while using Bun to install packages
and run project commands. Keep domain logic independent of runtime-specific APIs.

Use Vitest for TypeScript tests and Foundry for Solidity tests. Choose supported dependency
versions from current official documentation when implementation is authorized. Do not install
tooling during the documentation-only setup phase.

## Alternatives considered

- A single TypeScript package with internal directories has less configuration and remains viable
  if workspace boundaries prove disproportionate. It relies more on convention for isolation.
- Additional build orchestration can be reconsidered if build/deployment complexity warrants it;
  the first CLI milestone does not yet provide that evidence.
- A Bun worker runtime could reduce runtime tooling, but changes the original Node.js requirement
  and needs an explicit decision rather than inference from the package-manager preference.

## Consequences

Explicit boundaries should keep protocol I/O out of arithmetic and make correctness easier to test.
Workspaces introduce package/export configuration, which must stay proportionate to the project.
The minimal frontend and persistence arrive with the first working backend; richer terminal and
execution features follow in their milestones. None is created as an unapproved setup placeholder.

## Acceptance and validation criteria

- User accepts or amends the proposed boundaries and worker runtime.
- User separately approves a bounded implementation scope.
- Approved setup can install reproducibly using Bun and a committed lockfile.
- Domain code has no dependency on protocol I/O, persistence, frontend, or contract deployment.
- Documented commands run the approved slice and its meaningful checks.

## Approval record

Bun preference is established by the user's instruction, “use bun.” On 2026-11-17, after the
workspace and Node.js runtime with Bun tooling were presented for review, the user said:
“i accept adr 1, now reading m1”. This accepts this ADR's design. The user is still reviewing
M1-01; implementation approval has not been granted. Implementation authorization is maintained
in the linked M1-01 task.

## Implementation and evidence

Not implemented. No dependency versions selected, packages installed, or checks executed for this ADR.
