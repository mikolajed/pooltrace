# M1-01: Tooling and workspace foundation

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0002](../adr/0002-typescript-first-and-measured-evolution.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md)
- Requirement IDs: Tooling and boundaries in [ENGINEERING.md](../ENGINEERING.md)
- Depends on: Satisfied; user accepted ADR-0001 and approved this task on 2026-11-17

## Outcome

A minimal, reproducible TypeScript development foundation using Bun for dependency management and
project commands for the local UI/backend applications, ready for separately approved registry,
quotation, minimal persistence, and UI/API work.

## Scope

Implement the accepted initial workspace structure, select supported tooling versions,
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
package management/commands are selected. The implemented foundation pins and configuration are
documented in [ENGINEERING.md](../ENGINEERING.md#foundation-toolchain). ADR-0004 selects local
UI/backend process separation, backend-owned early SQLite, and on-demand Anvil later; it does not
approve this task's implementation. Future migration and CI/CD intent do not expand this task's scope.

## Acceptance criteria

- [x] User has accepted the design in ADR-0001.
- [x] User has explicitly approved this implementation scope.
- [x] Runtime and supported tooling versions are documented with authoritative references.
- [x] Dependencies install reproducibly using Bun and its lockfile.
- [x] Documented setup/check commands work for the foundation without implying a working scanner.
- [x] Configuration guidance keeps real credentials out of Git.
- [x] No unrelated domain, protocol, executor, database, or UI implementation is included.

## Planned validation

Inspect the resulting boundaries and dependency graph, run the approved installation/configuration
checks, and verify the documented commands. Do not create dummy behavioral tests simply to claim a
passing suite. This task needs no live RPC or fork verification.

## Approval record

- Design acceptance: Workspace/runtime accepted in ADR-0001 on 2026-11-17; TypeScript-first
  direction accepted in ADR-0002; local topology/early persistence direction accepted in ADR-0004.
- Implementation approval: Granted on 2026-11-17 for M1-01 only.
- Approved scope and user instruction: “committen, i accept # M1-01: Tooling and workspace foundation”.
  This authorizes the foundation scope above, including dependency installation and setup checks.
  That instruction did not authorize subsequent tasks, commits, or pushes.

On 2026-11-17 the user said “i accept adr 1, now reading m1”. This accepts the design while
leaving this task under review; it does not authorize implementation.

The later explicit acceptance of M1-01 above completes the required implementation approval.

On 2026-11-17, after asking “new commit?”, the user clarified “dont commit i can onlu commit”.
Only the user creates commits. Agents may prepare changes and suggest a commit message, but must
not commit. This clarification does not authorize a push or another task.

## Evidence and handoff

Completed on 2026-11-17 under the approval above. The repository was clean at the start, with the
user's documentation commit `6c0fbde` present. Changes remain uncommitted for the user. An attempted
staging command was rejected before execution; no agent commit or push was performed.

### Delivered foundation

- Private root `package.json` with `apps/*` and `packages/*` workspace declarations and generated
  `bun.lock`. No empty application/domain/protocol/contract packages were created: the root tooling
  is the only implemented slice, and the target package layout remains in ADR-0001.
- Pinned Node.js 26.3.1 and Bun 1.3.11 in the manifest and version files; a real TypeScript tooling
  script checks those runtime pins. These are the locally validated versions, not latest-release claims.
- Exact development dependencies: TypeScript 7.0.2, `@types/node` 26.6.6, and Biome 2.6.8.
  Their transitive dependencies are CLI/platform packages and `undici-types`; no application
  dependencies or additional build orchestration were introduced.
- Shared strict TypeScript settings, a root no-emit check for the tooling script, and Biome
  formatting/lint configuration for TypeScript/JSON with Git ignores and editor settings respected.
- Documented setup/individual checks in the root README, toolchain references and conventions in
  ENGINEERING.md, and `.env.example` with an empty future backend RPC setting. No credentials,
  deployment addresses, database schema, API, CLI scanner, or UI behavior were added.

### Validation performed

- `bun add --dev --exact typescript @types/node@26 @biomejs/biome` installed the development tools.
  Pinned the resolved Node types to 26.6.6 explicitly and refreshed with `bun install --lockfile-only`.
  Both package-manager operations initially hit sandbox temporary-file permission errors; approved
  elevated reruns succeeded. No global runtime/tool installation was performed.
- The first `bun run check` passed runtime/type checks but reported a package formatting difference,
  a deprecated Biome rule setting, and a literal-key lint diagnostic. Updated the configuration/key
  and ran `bun run format`; the subsequent `bun run check` passed with no diagnostics.
- `bun run check` ran `check:toolchain`, `typecheck`, `lint`, and `format:check` successfully using
  Node.js 26.3.1 and Bun 1.3.11. Biome checked five actual TypeScript/JSON files. No dummy tests or
  pass-with-no-tests command was added.
- `bun install --frozen-lockfile` succeeded in the repository with no install changes. Repeated it
  in a fresh temporary copy with no `node_modules`: six platform-applicable packages installed, and
  `bun run check` passed there too. SHA-256 comparisons confirmed manifest/lockfile bytes were
  unchanged in both copies. This verifies a fresh dependency tree on the same macOS/arm64 host and
  Bun cache; it does not claim a cold-cache or other-platform run.
- `bun pm ls --all` confirmed the development-only dependency graph. `bun pm untrusted` reported
  zero untrusted dependencies with scripts.
- `git check-ignore --no-index` confirmed root/nested `.env`, `.env.local`, and `node_modules/`
  are ignored; a separate check confirmed `.env.example` remains trackable. The RPC template is empty,
  and foundation commands do not load it or access RPC. The supplied logo SHA-256 is unchanged.
- Manual manifest/configuration checks confirmed exact pins agree with the version files, only
  development dependencies are present, and no application/contract/data directories were created.
- Final documentation checks passed for local links/anchors, whitespace, and CR IDs across 26
  Markdown files; `git diff --check` passed. Approval-state checks confirm M1-01 is Done and later
  tasks remain unapproved. At that implementation check, Git HEAD was the user's `6c0fbde` commit.

### Limitations and next action

No application behavior or financial correctness requirement is verified by this tooling task.
There is no market-data integration, behavioral test suite, executable scanner, database, UI, fork,
or benchmark. Vitest, viem, SQLite, frontend dependencies, and Foundry will be added when approved
work needs them. Root TypeScript checking currently covers only the tooling script; future workspace
checks must be added with those packages.

The next proposed task is M1-02: prepare the registry and consistent-snapshot ADR. It requires its
own approval; it has not been started.

### Earlier design-acceptance handoff

Before implementation approval, design acceptance was recorded on 2026-11-17:

- Updated ADR-0001, its index, this task, and current documentation to reflect the accepted design.
  Added subsequent-decision notes to ADR-0002/0004 while preserving their original approval records.
- Local-link verification passed across 26 Markdown files; `git diff --check` passed.
- Approval-state checks confirmed ADR-0001 is Accepted and M1-01 remains Proposed with implementation
  approval not granted. Changed-file inspection found 11 Markdown files only and no untracked files.
- At that handoff, the next action was to await the user's review and implementation approval.
