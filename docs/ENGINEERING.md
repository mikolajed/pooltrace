# Engineering conventions

These are requirements and working conventions for future approved implementation. They do not
authorize code or dependency installation.

## Tooling baseline

| Area | User-specified direction | Decision still needed |
| --- | --- | --- |
| Package management and commands | Bun; version and lockfile policy below | Review upgrades when changing the toolchain |
| Initial application | TypeScript backend and frontend; Node.js backend runtime and workspace boundaries under [ADR-0001](adr/0001-project-boundaries-and-tooling.md); foundation pins below | Package-specific build configuration as approved applications are introduced |
| EVM interaction | viem 2.57.20 installed and verified under accepted [ADR-0005](adr/0005-registry-verification-and-consistent-snapshots.md) | Later quotation integration under M1-04/05 |
| Contracts and local forks | Solidity, Foundry, Anvil | Compiler/dependency versions, router APIs, and local execution design |
| TypeScript tests | Vitest 5.1.0; offline package tests executed through Node | Additional meaningful checks with approved behavior |
| Evidence persistence | SQLite initially, under [ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) | Driver, schema, migrations, and writer ownership |
| Terminal | Next.js, React, Tailwind, shadcn/ui, SSE | Versions, read path, and reconnect semantics |
| Local runtime topology | UI application + one backend; early embedded SQLite; on-demand Anvil in M2 | Application configuration/lifecycle and later fork toolchain under [ADR-0004](adr/0004-local-processes-and-gated-deployment.md) |

Bun manages dependencies and project commands; the backend runs on Node.js under ADR-0001.
Foundation versions are selected below. Deployment addresses remain unselected.

## Foundation toolchain

M1-01 selected a small root-only foundation. `package.json` declares private Bun workspaces at
`apps/*` and `packages/*`; application/domain/protocol packages are added with their approved
implementation tasks. Its foundation development tools remain:

| Tool | Pinned version | Role and source |
| --- | --- | --- |
| Node.js | 26.3.1 | Executes project TypeScript tooling using native type stripping; [release](https://nodejs.org/en/blog/release/v26.3.1), [TypeScript support](https://nodejs.org/api/typescript.html) |
| Bun | 1.3.11 | Dependency management and command runner; [release](https://bun.com/blog/bun-v1.3.11), [workspaces](https://bun.com/docs/pm/workspaces), [installation/lockfile options](https://bun.com/docs/pm/cli/install) |
| TypeScript | 7.0.2 | Static checking with the official compiler CLI; [release](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2), [compiler options](https://www.typescriptlang.org/tsconfig/) |
| Node.js types | 26.6.6 | Node 26 type declarations; [maintained definitions](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) |
| Biome | 2.6.8 | Formatting and recommended lint rules; [installation](https://biomejs.dev/installation/quick-start/), [configuration](https://biomejs.dev/reference/configuration/) |

References checked on 2026-11-17. These pins identify the versions validated locally, not a claim
that they are the latest releases. Installed package metadata declares Node.js `>=16.20.0` for
TypeScript and `>=14.21.3` for Biome; both include this development runtime. Exact direct dependency
versions and the generated text `bun.lock` fix the resolved dependency graph. Reproduce installation
with `bun install --frozen-lockfile`; use `bun install` only when intentionally changing dependencies
and review the resulting manifest/lockfile together. Keep the lockfile in version control.

`tsconfig.base.json` sets strict checking, exact optional properties, checked indexed access, and
NodeNext ESM resolution with ES2023 libraries. M1-03 adds DOM type declarations because viem's
transitive `ox` types reference WebAuthn browser names; `skipLibCheck` stays false and the backend
still executes on Node. Root `tsconfig.json` checks real tooling under `scripts/` and the Vitest
configuration; package configurations check their source and tests with no emitted artifacts.
Erasable syntax and explicit module
semantics match Node's native TypeScript support; type stripping does not replace static checking.
Future browser packages will select their own module/library settings when approved.

Biome currently includes TypeScript and JSON files, respects `.gitignore`, uses two-space
indentation from `.editorconfig`, and leaves Markdown and the generated Bun lockfile outside its
formatting scope. The root scripts invoke the installed CLI files explicitly through Node;
Bun remains the package manager and project command entry point. `check:toolchain` rejects a runtime
that differs from the version files. [The root README](../README.md#development-setup) owns setup
commands and local environment guidance.

## Registry/snapshot integration

Approved M1-03 installs exact viem **2.57.20** in `@pooltrace/protocols` and Vitest **5.1.0** as a root
development tool. `@pooltrace/backend` depends on the protocol workspace. Both private packages
export their actual TypeScript source; no unrelated workspace scaffold is created.
[viem release](https://github.com/wevm/viem/releases/tag/viem@2.57.20),
[Vitest release](https://github.com/vitest-dev/vitest/releases/tag/v5.1.0),
[Vitest guide](https://vitest.dev/guide/). References rechecked on 2026-11-17; runtime, wire-level,
clean-install, and live results are in [M1-03 evidence](tasks/M1-03-registry-and-consistent-snapshots.md#evidence-and-handoff).

The viem public client uses a [custom transport](https://viem.sh/docs/clients/transports/custom)
backed by the bounded HTTP reader, with viem retries and multicall disabled and caching off.
`getCode` and ABI-encoded `call` carry the actual hash/canonical selector. Chain/header validation
uses direct uncached JSON-RPC requests through the same limits. The transport owns timeout,
deadline, concurrency, retry, cancellation, and sanitized errors in one place; every send is counted.
No wallet client or transaction method is exposed. Policy, exact quantities, provenance, and
eligibility live in immutable observations; no database or long-running collection loop is added.

`bun run check` covers tooling, both packages, lint/formatting, and offline tests. Only the explicit
`bun run check:live` harness uses the configured endpoint and writes ignored integration reports.
SQLite, frontend dependencies, and Foundry remain deferred to their approved tasks.

## Language evolution

[ADR-0002](adr/0002-typescript-first-and-measured-evolution.md) records the accepted TypeScript-first
direction and planned later evolution, potentially to a Rust backend, TypeScript frontend, and
Python research tools. Begin with TypeScript application code only; Solidity and Foundry/Anvil
remain part of the contract/fork toolchain. Future language/process boundaries need their own design
and implementation approvals.

Keep the initial TS system usable as a reference. Preserve explicit domain boundaries, evidence
contracts, units, rounding, and error behavior so later replacements can be checked against it.
Do not create a generic cross-language framework or separate services in anticipation of migration.

Benchmark replacements using the [draft comparison plan](BENCHMARKING.md). Keep authoritative
financial calculations consistent across implementations; adding languages is not itself evidence
of improved robustness or performance.

## Storage evolution

[ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) records SQLite as the initial persistence
choice and PostgreSQL, ClickHouse, Parquet, and object storage as future candidates. It owns the
possible roles, adoption criteria, preservation requirements, and authoritative references.

Keep database-specific operations outside domain calculations. Future storage choices must preserve
exact amounts and evidence semantics. ADR-0004 moves the reviewed minimal driver/schema/migration
design into M1; M3 covers richer evidence/replay/recovery. Both require implementation approval.
Language and storage migrations can proceed independently. Use the storage comparison methodology
in [BENCHMARKING.md](BENCHMARKING.md) before claiming an improvement.

## Local execution and future releases

[ADR-0004](adr/0004-local-processes-and-gated-deployment.md) selects separate UI/backend application
processes on localhost. Collection, RPC, analysis, storage, API, and SSE are backend modules rather
than independent services. The backend owns SQLite access; Anvil is a separate on-demand process
introduced with M2, initially one fork job at a time. CLI access must not create another independent
collection or calculation authority.

[DEPLOYMENT.md](DEPLOYMENT.md) owns process lifecycle and the draft future CI/CD/environment plan.
Keep checks reproducible locally before automating them. Hosting and pipeline implementation remain
future tasks; passing CI does not authorize a production change. Preserve data separately from
release artifacts and verify migration/recovery behavior before a hosted rollout.

## Structure and dependencies

Separate domain calculations, protocol I/O, worker orchestration, persistence, web presentation,
and Solidity execution. ADR-0001 selects the target directory layout; create packages only when
needed by approved implementation.

Keep arithmetic independent of RPC clients, storage, frontend code, and ambient time. Pass external
state into domain calculations explicitly. Favor the smallest design that satisfies the approved
scope; do not add orchestration frameworks, services, or abstractions without a concrete need.

## Integration and configuration

- Consult current official documentation when integrating a dependency. Preserve the source,
  retrieval date, and important assumptions in the relevant ADR or implementation documentation.
- Verify deployment and token addresses from authoritative sources and on-chain state before use.
  Do not choose pools solely from an example or presumed popularity.
- Document configuration, units, defaults, and failure behavior. Provide `.env.example` with the
  approved runtime setup; keep actual credentials out of Git, reports, fixtures, and logs.
- Never silently substitute fixtures when live access fails. Fixture mode must be explicit.

## Verification and reporting

Use Vitest for meaningful TypeScript checks and Foundry for contract unit, fuzz, invariant, and fork
checks, as applicable to the approved task. Link checks to the stable requirements in
[CORRECTNESS.md](CORRECTNESS.md), rather than testing only implementation details.

Separate offline tests, live RPC integration checks, and local-fork execution evidence. Record the
commands actually run and their outcomes in the task record; do not invent successful results.
Testing is not formal verification. Security assumptions and remaining limitations must be stated.

Write setup and mathematics documentation alongside approved work. Optional enhancements belong in
the backlog, not in an unapproved expansion of the current task.
