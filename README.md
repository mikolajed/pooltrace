# Pooltrace

A DeFi arbitrage research and simulation terminal built around one question:

> Does this apparent arbitrage opportunity survive realistic trade sizing, transaction costs,
> and execution simulation?

Pooltrace is an ongoing product developed through focused, explicitly approved milestones.
Individual milestones have bounded deliverables; the project has no fixed completion date or
permanent feature ceiling.

## Current status

**M1-03 registry verification and consistent snapshots is complete.**

See [current state](docs/STATUS.md) for what exists and the next proposed action. The foundation
now includes a tested, read-only backend/protocol slice. See the
[M1-03 record](docs/tasks/M1-03-registry-and-consistent-snapshots.md) for actual offline/live evidence
and the remaining finite-size qualification boundary.

## Start here

| Document                                        | Purpose                                                       |
| ----------------------------------------------- | ------------------------------------------------------------- |
| [Documentation map](docs/README.md)             | Sources of truth, reading paths, and maintenance rules        |
| [Agent entry point](AGENTS.md)                  | Short approval guardrail and navigation                       |
| [Current state](docs/STATUS.md)                 | Session handoff and next proposed action                      |
| [Product brief](docs/PRODUCT.md)                | Product vision, milestone workloads, and interface priorities |
| [Correctness requirements](docs/CORRECTNESS.md) | Stable requirements for calculations, execution, and evidence |
| [Engineering conventions](docs/ENGINEERING.md)  | Selected tools and implementation conventions                 |
| [Benchmark plan](docs/BENCHMARKING.md)          | Draft methodology for comparing the TS baseline and upgrades   |
| [Deployment plan](docs/DEPLOYMENT.md)          | Local processes and future gated releases                      |
| [Development workflow](docs/WORKFLOW.md)        | Authorization and task lifecycle                              |
| [Architecture decisions](docs/adr/README.md)    | ADR workflow, template, and decision index                    |
| [Roadmap](docs/ROADMAP.md)                      | Milestone sequence, dependencies, and continued development    |
| [Backlog](docs/BACKLOG.md)                      | Tasks and acceptance criteria, including logo work            |
| [Brand reference](docs/brand/README.md)         | Original perched kingfisher preview and asset requirements    |

## Development process

Follow the [development workflow](docs/WORKFLOW.md). Detailed task records separate scope and
approval from architectural rationale; the backlog remains the inventory of work.

**Bun is the selected package manager and command runner; Node.js is the backend runtime.**
Workspace boundaries are accepted in [ADR-0001](docs/adr/0001-project-boundaries-and-tooling.md).
The installed foundation toolchain and its authoritative references are recorded in
[engineering conventions](docs/ENGINEERING.md#foundation-toolchain).

The accepted language direction is **TypeScript first**, followed by planned backend evolution,
potentially using Rust with a TypeScript frontend and Python research tools. Compare later upgrades
against the validated TS baseline; no performance or robustness improvement is assumed. See
[ADR-0002](docs/adr/0002-typescript-first-and-measured-evolution.md). Solidity remains the executor
language. This direction does not authorize implementation.

**SQLite is the initial database.** PostgreSQL, ClickHouse, Parquet datasets, and bucket/object
storage are future options with different roles, not mandatory additions. Their adoption and
comparison criteria are recorded in [ADR-0003](docs/adr/0003-sqlite-first-and-storage-evolution.md).

The agreed local architecture is a UI application and one TypeScript backend, with minimal
backend-owned SQLite from the first working backend milestone. Anvil joins as an on-demand process
with fork validation. [ADR-0004](docs/adr/0004-local-processes-and-gated-deployment.md) records the
decision; [the deployment plan](docs/DEPLOYMENT.md) covers future CI/CD, staging, and production gates.

The foundation and registry/snapshot tasks have been separately approved and completed.
The wider M1 milestone is a local read-only research application with minimal UI/persistence and
CLI access to the same backend behavior. Each implementation task requires its own authorization.

## Development setup

Use Node.js **26.3.1** and Bun **1.3.11**, as recorded in `.node-version` and `.bun-version`.
These are the pinned, locally validated development versions. Toolchain upgrades should update the
pins and manifest together, then rerun the setup checks. Installation options are documented by
[Node.js](https://nodejs.org/en/download) and [Bun](https://bun.com/docs/installation).

From the repository root:

```sh
bun install --frozen-lockfile
bun run check
```

`bun run check` verifies the runtime pins, type-checks tooling and both working packages, runs Biome
lint/format checks, and runs the offline Vitest suite. It needs no RPC credentials after installation.
Individual commands are `bun run check:toolchain`, `bun run typecheck`, `bun run lint`,
`bun run format:check`, and `bun run test`. Use `bun run format` to apply formatting.

`packages/protocols` owns the sourced Ethereum registry, ABI reads, verification, and bounded RPC
transport. `apps/backend` owns configuration, one-attempt collection, eligibility, and revalidation.
Both expose TypeScript source to the pinned Node runtime. There is no application service/start
command, public market CLI/API, UI, or database yet.

For the explicit read-only integration check, copy `.env.example` to root `.env` and supply the
selected Alchemy Ethereum mainnet URL as `ETHEREUM_RPC_URL`. Keep it private. Optional
`RPC_PROVIDER_LABEL` and `RPC_CONFIG_REVISION` are nonsecret provenance labels; defaults are
`alchemy-ethereum` and `alchemy-ethereum-v1`. Change the revision when changing the endpoint.
HTTP(S) URLs without embedded user/password credentials are supported; path/query API keys stay
inside ignored environment files. Never expose the endpoint through a `NEXT_PUBLIC_` variable.

```sh
bun run check:live
```

This explicit harness reads root `.env`, then `.env.local`, then process environment overrides.
It collects at the current head, re-reads the same block in historical mode for state comparison,
waits for the five-second validation expiry, and revalidates before checking eligibility again.
It writes a sanitized `data/m1-03-live-<attemptId>.json` report and exits nonzero if a required gate
fails. Reports contain public chain data and nonsecret labels; `data/` is ignored. There is no
fallback endpoint or automatic fixture substitution. Offline fixtures are injected explicitly in tests.

Backend consumers use `collectSnapshot`, `eligibility`, `revalidateSnapshot`, and `prepareForUse`
from `apps/backend/src/index.ts`. Collection returns immutable evidence; revalidation appends events
to a new observation. Recompute eligibility before use; `prepareForUse` renews an expired validation.
Monotonic times belong to the collecting process: serialized reports are historical evidence, not
reloadable live eligibility. The fixed thresholds and units are documented in ADR-0005.
Identity and positive structural screens leave finite-size suitability unavailable and workload
admission false until M1-04/05. This slice produces no quotation or profitability result.
