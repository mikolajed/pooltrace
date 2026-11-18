# Pooltrace

A DeFi arbitrage research and simulation terminal built around one question:

> Does this apparent arbitrage opportunity survive realistic trade sizing, transaction costs,
> and execution simulation?

Pooltrace is an ongoing product developed through focused, explicitly approved milestones.
Individual milestones have bounded deliverables; the project has no fixed completion date or
permanent feature ceiling.

## Current status

**M1-08 analysis documentation and evidence guide is complete.**

See [current state](docs/STATUS.md) for what exists and the next proposed action. The foundation
includes tested domain/protocol/backend modules and an explicit live/fixture CLI for read-only
cycle comparisons. See the [M1-06 record](docs/tasks/M1-06-cli-and-configuration.md) for command
evidence and the [M1-05 record](docs/tasks/M1-05-quotation-and-cycle-analysis.md) for underlying
quotation evidence. Transaction costs, net profit, and execution remain unavailable.
The [M1-07 record](docs/tasks/M1-07-validation-and-regression-coverage.md#evidence-and-handoff)
maps independent vectors and controlled failure checks to actual results: 158 offline tests pass,
with production behavior unchanged.
Read the [analysis guide](docs/ANALYSIS.md) for implemented math, constructed examples, result
states, and an archived CLI walkthrough. Storage, browser/API access, and application lifecycle
remain later M1 tasks.

## Start here

| Document                                        | Purpose                                                       |
| ----------------------------------------------- | ------------------------------------------------------------- |
| [Documentation map](docs/README.md)             | Sources of truth, reading paths, and maintenance rules        |
| [Agent entry point](AGENTS.md)                  | Short approval guardrail and navigation                       |
| [Current state](docs/STATUS.md)                 | Session handoff and next proposed action                      |
| [Product brief](docs/PRODUCT.md)                | Product vision, milestone workloads, and interface priorities |
| [Correctness requirements](docs/CORRECTNESS.md) | Stable requirements for calculations, execution, and evidence |
| [Read-only analysis guide](docs/ANALYSIS.md)     | Implemented math, units, examples, result states, and evidence |
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

`bun run check` verifies the runtime pins, type-checks tooling and all three working packages, runs Biome
lint/format checks, and runs the offline Vitest suite. It needs no RPC credentials after installation.
Individual commands are `bun run check:toolchain`, `bun run typecheck`, `bun run lint`,
`bun run format:check`, and `bun run test`. Use `bun run format` to apply formatting.

`packages/domain` owns pure exact arithmetic, qualification, composition, and ranking.
`packages/protocols` owns the sourced Ethereum registry, ABI reads, verification, and bounded RPC
transport. `apps/backend` owns configuration, one-attempt collection, eligibility, and revalidation.
All three expose TypeScript source to the pinned Node runtime. The diagnostic CLI below invokes
these shared modules. Application services, an HTTP API, UI, and database remain later tasks.

## Diagnostic CLI

Run from the repository root after installation:

```sh
bun run cli --help
bun run cli --mode fixture
bun run cli --mode fixture --format json
bun run cli --mode live
bun run cli --mode live --format json
bun run cli --mode live --sizes '["10","50","100","500","1000","5000"]'
```

Select `--mode live|fixture` explicitly; there is no default mode or fallback. Each command
performs one attempt and exits. Fixture mode is offline and requires no valid RPC URL. Its pool
addresses, balances, quotation responses, and fixed block time are constructed diagnostics, never
market evidence. Live mode requires the private configuration described below.

Output defaults to plain text with all 36 route/size outcomes, block/hash and as-of times,
qualification, current admission, and the eligible best tested gross result. USDC/WETH decimals
are formatted exactly. A complete negative or zero gross result is a normal outcome. Positive
gross quotation alone would still leave transaction costs and estimated net profit unavailable.
Eligibility is computed immediately before output; the document does not remain fresh after exit.

`--format json` emits one `cli-v1` envelope on stdout, without progress or ANSI escapes. Its
`kind` is `result` or `error`; `mode`, `origin`, `constructed`, `status`, `reason`, `asOf` (Unix
milliseconds), `units`, `sizes`, `observation`, `analysis`, and `eligibility` retain evidence and
unavailable values. Bigint quantities, including block numbers and base-unit amounts, are exact
decimal strings. Sizes and cycle-row input/output/gross use 10^-6 USDC. Each leg quote's input/output
units follow its tokenIn/tokenOut; the intermediate leg-1 output uses 10^-18 WETH.
`--help --format json` instead returns `{formatVersion, kind: "help", help}` without reading
configuration. Help accepts only the optional format flag; duplicate/unknown flags, positionals,
or combining help with mode/sizes are usage errors. Bun may print its command banner to stderr;
redirect stdout alone for a JSON document.

| Exit | Meaning |
| --- | --- |
| 0 | Help or a usable result, including a qualified fixture or nonpositive gross result. Fixture success never means live admission. |
| 1 | Runtime failure, or rejected/incomplete/stale/invalidated/unavailable analysis. Returned diagnostics remain evidence. |
| 2 | Invalid arguments or configuration; RPC has not started. Errors do not echo supplied values. |
| 130 | SIGINT interruption; the CLI cancels its owned work and exits. |

Live and fixture sizes use `--sizes` first, then `USDC_INPUT_AMOUNTS`, then the six defaults.
Every override must be a JSON array of exactly six increasing, distinct, positive decimal strings
with at most six places. Both modes load root `.env`, then `.env.local`, then defined process
values (including empty values); fixture mode ignores the live URL/provider settings. Help loads
neither file. No endpoint URL argument is accepted.

## Private live configuration and integration checks

For live CLI runs and the explicit read-only integration checks, copy `.env.example` to root `.env` and supply the
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
fallback endpoint or automatic fixture substitution. CLI fixture mode is explicitly selected;
tests inject constructed transports through the same protocol boundary.

Backend consumers use `collectSnapshot`, `eligibility`, `revalidateSnapshot`, and `prepareForUse`
from `apps/backend/src/index.ts`. Collection returns immutable evidence; revalidation appends events
to a new observation. Recompute eligibility before use; `prepareForUse` renews an expired validation.
Monotonic times belong to the collecting process: serialized reports are historical evidence, not
reloadable live eligibility. The fixed thresholds and units are documented in ADR-0005.
The source snapshot retains its structural-only suitability fields. Quotation analysis produces
separate qualification records without rewriting that source evidence.

To run the explicit quotation integration gate with the same private configuration:

```sh
bun run check:quotes:live
```

The default USDC sizes are 10, 50, 100, 500, 1000, and 5000. Optional `USDC_INPUT_AMOUNTS` is a
JSON array of exactly six increasing, distinct, positive decimal strings with at most six decimal
places; see `.env.example`. Invalid configuration fails before RPC. Inputs and outputs stay exact
base-unit integers; these are USDC amounts, not assumed USD values.

The harness collects one snapshot, analyzes all 36 route/size combinations, checks real elapsed
validation expiry/revalidation, and replays the same block in historical mode. It compares amounts,
qualification, and ranking; quoter gas is diagnostic. It writes a sanitized
`data/m1-05-live-<observationId>.json` report and exits nonzero unless the required live grid,
expiry/use check, and replay pass. Eligibility fields are as-of their recorded validation events.
No positive gross return is needed for a passing gate.

Consumers call `analyzeSnapshot` with a collected observation and private backend configuration,
then recompute `analysisEligibility` before using a result. `prepareAnalysisForUse` renews expired
validation and returns new evidence. Qualification is specific to the recorded block, directions,
inputs, and policy. All 36 entries must qualify; failed grids retain diagnostics with no
authoritative best result. Historical/fixture results retain their origin and never become live.

The result ranks signed USDC gross surplus, with deterministic size/route tie breaks. The best
tested gross result may be negative or zero; it does not claim an optimum or net profit. Live
transaction costs and net profit remain explicitly unavailable until a reviewed full-transaction
cost producer exists. There is no wallet, transaction submission, executor, or fork execution here.
