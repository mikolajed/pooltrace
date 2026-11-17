# Current state

Updated: 2026-11-17.

## Phase and authorization

**Documentation/setup only. No implementation is approved.**

The user has requested setup/documentation work for an ongoing product developed through bounded
milestones. Application, database, pipeline, and infrastructure implementation are not authorized.
[WORKFLOW.md](WORKFLOW.md) defines the approval process; individual task records hold implementation
authorizations when they exist.

## What exists

- Project introduction, documentation map, product scope, correctness requirements, engineering
  conventions, and approval workflow.
- Roadmap, backlog, task template, a documentation setup task, and a proposed first implementation task.
- ADR workflow/template and accepted ADR-0001 for workspace boundaries, a Node.js backend runtime,
  and Bun tooling. M1-01 implementation remains under user review.
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

No application code, package manifests, installed dependencies, lockfile, executable CLI, executor,
database, terminal, or test suite. No live RPC or fork verification has been performed.

## Next proposed action

The user is reviewing [M1-01: tooling and workspace foundation](tasks/M1-01-tooling-and-workspaces.md).
[ADR-0001](adr/0001-project-boundaries-and-tooling.md) is accepted. Await explicit M1-01 implementation
approval before creating a scaffold or installing tooling.

The [backlog](BACKLOG.md) owns the work inventory. This summary is a handoff aid, not permission
to start the next task.

## Latest handoff

On 2026-11-17 the user accepted ADR-0001 and said they are reading M1. Design acceptance is recorded
in the ADR and reflected in the task and current documentation. M1-01 remains Proposed with no
implementation authorization. No code, dependencies, or runtime checks were introduced.
Local links and approval states were checked; `git diff --check` passed. Evidence is recorded in
M1-01.
