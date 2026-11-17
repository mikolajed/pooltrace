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
- ADR workflow/template, proposed ADR-0001, and accepted ADR-0002 for the TypeScript-first language
  direction and benchmarking intent. Workspace/runtime and future migration designs remain open.
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

Review [M1-01: tooling and workspace foundation](tasks/M1-01-tooling-and-workspaces.md) and
[ADR-0001](adr/0001-project-boundaries-and-tooling.md), including the worker runtime. Obtain explicit
design acceptance and implementation approval before creating a scaffold or installing tooling.

The [backlog](BACKLOG.md) owns the work inventory. This summary is a handoff aid, not permission
to start the next task.

## Latest handoff

Project framing now describes Pooltrace as an ongoing product without a fixed completion date or
permanent feature ceiling. Scope and any delivery estimates apply to individual milestones.
Documentation and ADR contexts were updated at the user's request; technical decisions, record IDs,
and approval states are preserved. [SET-13](tasks/SET-13-product-framing-and-milestone-scope.md)
records this documentation task and its checks.

The cleanup is complete. Wording checks, local links, requirement references, approval states,
whitespace, changed-file scope, and logo preservation passed verification.

The local UI/backend architecture, early SQLite, and later Anvil remain selected in ADR-0004.
M1's workload and M2's fork-only execution are milestone boundaries, not permanent product limits.
Future backend/storage evolution and deployment gates remain planned in their existing records.

Implementation, concrete future hosting/migration designs, and benchmark execution are not approved;
no code or results exist.
