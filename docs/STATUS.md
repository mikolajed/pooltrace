# Current state

Updated: 2026-11-17.

## Phase and authorization

**M1-01 tooling and workspace foundation is complete. No subsequent task is approved.**

The user approved M1-01 on 2026-11-17; its foundation implementation and checks are complete.
Subsequent application, database, pipeline, and infrastructure work remains separately gated.
[WORKFLOW.md](WORKFLOW.md) defines the approval process; individual task records hold implementation
authorizations when they exist.

## What exists

- Project introduction, documentation map, product scope, correctness requirements, engineering
  conventions, and approval workflow.
- Roadmap, backlog, task template, documentation task evidence, and completed M1-01 evidence.
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

Review M1-01, then approve M1-02 to prepare the registry and consistent-snapshot ADR addressing
CR-02/CR-03. That task has not started. M1's remaining implementation requires separate approval.

The [backlog](BACKLOG.md) owns the work inventory. This summary is a handoff aid, not permission
to start the next task.

## Latest handoff

M1-01 is complete. Frozen-lockfile installation and `bun run check` passed both in the repository
and in a fresh temporary copy on this host; manifest/lockfile bytes were preserved. Runtime pins,
static checking, lint, formatting, dependency boundaries, and secret ignore rules were verified.
[The task](tasks/M1-01-tooling-and-workspaces.md) records commands, resolved initial failures,
references, and limitations. Foundation changes are ready for the user's commit. Only the user
creates commits; no agent commit was made and no later task was started.
