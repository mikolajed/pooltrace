# 0001: Project boundaries and tooling

- Status: Proposed
- Proposed on: 2026-11-17
- Decision accepted by user: Not yet
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
[ADR-0002](0002-typescript-first-and-measured-evolution.md). This record still proposes the initial
workspace layout and worker runtime, not a future multi-language process design.

[ADR-0004](0004-local-processes-and-gated-deployment.md) now selects two local application processes,
early SQLite, and later on-demand Anvil. The directory sketch below is updated to support that
decision, but exact package boundaries and the Node/Bun backend runtime remain proposed here.

## Proposed decision

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

These directories are a proposal, not an implemented scaffold. Add each application/package only
when its implementation is approved. Avoid a monorepo orchestration framework initially.

Propose keeping the worker on Node.js as requested in the original brief while using Bun to install
packages and run project commands. If a Bun worker runtime is preferred, settle that explicitly
before implementation. Keep domain logic independent of runtime-specific APIs either way.

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

Bun preference is established by the user's instruction, “use bun.” The workspace design, worker
runtime proposal, and design acceptance remain pending review. Implementation authorization is
maintained in the linked M1-01 task, not granted by this ADR.

## Implementation and evidence

Not implemented. No dependency versions selected, packages installed, or checks executed for this ADR.
