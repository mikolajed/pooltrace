# Pooltrace

A DeFi arbitrage research and simulation terminal built around one question:

> Does this apparent arbitrage opportunity survive realistic trade sizing, transaction costs,
> and execution simulation?

Pooltrace is an ongoing product developed through focused, explicitly approved milestones.
Individual milestones have bounded deliverables; the project has no fixed completion date or
permanent feature ceiling.

## Current status

**M1-01 tooling and workspace foundation is complete.**

See [current state](docs/STATUS.md) for what exists and the next proposed action. The foundation
provides development tooling; application behavior belongs to subsequent approved tasks.

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

The first approved task is [M1-01: tooling and workspace foundation](docs/tasks/M1-01-tooling-and-workspaces.md).
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

`bun run check` verifies the runtime pins, type-checks the actual tooling script, and lints/checks
formatting for TypeScript and JSON files. It runs entirely offline after dependency installation.
Individual commands are `bun run check:toolchain`, `bun run typecheck`, `bun run lint`, and
`bun run format:check`. Use `bun run format` to apply formatting.

The private root manifest declares `apps/*` and `packages/*` as workspace locations. The accepted
target layout is in ADR-0001; each application/package is created when its feature implementation
is approved. The current root type-check covers `scripts/**/*.ts`; future workspaces will add their
own checks when introduced. There is no application start/build command or behavioral test suite yet.

`.env.example` reserves an empty `ETHEREUM_RPC_URL` for the later registry/snapshot work. The current
tooling does not use RPC configuration or connect to Ethereum, so setup needs no RPC credentials.
[Bun automatically loads `.env` files](https://bun.com/docs/runtime/environment-variables) for
commands; the foundation checks do not consume those application settings. When a later backend
task adds configuration, keep credentials in an ignored `.env` file on the backend side; never
expose them through a `NEXT_PUBLIC_` variable or commit them. The RPC provider, configuration
validation, ports, and database settings will be selected with the tasks that use them.
