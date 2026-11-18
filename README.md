# Pooltrace

A DeFi arbitrage research and simulation terminal built around one question:

> Does this apparent arbitrage opportunity survive realistic trade sizing, transaction costs,
> and execution simulation?

Pooltrace is an ongoing product developed through focused, explicitly approved milestones.
Individual milestones have bounded deliverables; the project has no fixed completion date or
permanent feature ceiling.

## Current status

**M1-01 through M1-12 are complete.**

See [current state](docs/STATUS.md) for what exists and the next proposed action. The foundation
includes a local read-only browser, API/SSE service, combined startup/shutdown, exact SQLite evidence
history, and an explicit live/fixture CLI over the shared analysis modules. See the [M1-06 record](docs/tasks/M1-06-cli-and-configuration.md) for command
evidence and the [M1-05 record](docs/tasks/M1-05-quotation-and-cycle-analysis.md) for underlying
quotation evidence. Transaction costs, net profit, and execution remain unavailable.
The [M1-07 record](docs/tasks/M1-07-validation-and-regression-coverage.md#evidence-and-handoff)
maps independent vectors and controlled failure checks to actual results. The current suite has
281 passing offline tests; [M1-11](docs/tasks/M1-11-local-api-sse-and-browser.md#implementation-evidence) and
[M1-12](docs/tasks/M1-12-local-startup-readiness-and-shutdown.md#implementation-evidence) record
clean installation/build, real browser/process checks, and actual live observation evidence.
Read the [analysis guide](docs/ANALYSIS.md) for implemented math, constructed examples, result
states, and an archived CLI walkthrough. [ADR-0008](docs/adr/0008-local-api-sse-and-process-interface.md)
defines the accepted local API/browser and startup behavior.

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

`bun run check` verifies the runtime pins, type-checks tooling, backend/domain/protocol packages and the web app, runs Biome
lint/format checks, and runs the offline Vitest suite. It needs no RPC credentials after installation.
The web application build is checked separately with `bun run build:web`.
Individual commands are `bun run check:toolchain`, `bun run typecheck`, `bun run lint`,
`bun run format:check`, and `bun run test`. Use `bun run format` to apply formatting.

`packages/domain` owns pure exact arithmetic, qualification, composition, and ranking.
`packages/protocols` owns the sourced Ethereum registry, ABI reads, verification, and bounded RPC
transport. `apps/backend` owns configuration, one-attempt collection, eligibility, revalidation,
and the embedded SQLite evidence store.
All three expose TypeScript source to the pinned Node runtime. The diagnostic CLI and local backend
invoke these shared modules. The pinned
better-sqlite3 13.2.0 native dependency is verified on macOS arm64 and Ubuntu 24.04 arm64 / Node
26.3.1; other hosts need their own compatibility checks. The package supplies the tested native binary without an
additional trusted install script.

## Local application

The local application has a backend process and a separate Next.js browser application. The backend
owns collection, analysis, SQLite, the read API, and SSE. Browser navigation, refresh, and reconnection
do not start another collector. No wallet, transaction executor, or Anvil is required.

From the repository root, select a mode explicitly:

```sh
bun run dev --mode fixture
bun run dev --mode live
```

Fixture mode is constructed offline data and needs no live credentials. Live mode uses the private
RPC configuration below. There is no automatic fallback between them. By default the browser is at
[http://127.0.0.1:4318](http://127.0.0.1:4318), with the backend at
[http://127.0.0.1:4317](http://127.0.0.1:4317). Both bind only to loopback. Wait for both applications
to report readiness; readiness establishes process/storage availability, not qualified market data
or a profitable result. RPC failures and unavailable observations remain visible while the service runs.

Stop with Ctrl+C. The foreground launcher cancels its applications, allows a 10-second graceful
period, and escalates only its remaining owned process groups. It never adopts or kills an existing
port owner, restarts a failed child automatically, or deletes an evidence file. Invalid configuration
exits 2, startup/runtime failure exits 1, SIGINT exits 130, and SIGTERM exits 143. Cleanup after an
uncatchable signal or blocked filesystem operation is not a hard time guarantee. Process-group
behavior is validated on macOS arm64 and Ubuntu 24.04 arm64; Windows remains unsupported.

The individual applications also remain usable in separate terminals:

```sh
bun run dev:backend --mode fixture
bun run dev:web --mode fixture
bun run build:web
```

Use the same mode and public connection settings for the two individual commands. The root
`.env.example` documents configurable `POOLTRACE_BACKEND_PORT` (4317), `POOLTRACE_WEB_PORT` (4318),
and `POOLTRACE_COLLECTION_DELAY_MS` (10000). Ports must differ and fall within 1024–65535; the delay
is an integer from 1000–300000 ms after an attempt finishes. Attempts do not overlap or queue up.
No setting increases the accepted market-data or canonicality age limits. `POOLTRACE_API_ORIGIN`,
if supplied, must equal the configured loopback backend origin. The browser obtains only public
connection settings at runtime; RPC credentials and database paths remain backend-only.

The browser shows route/size outcomes, exact gross amounts, provenance, independent save status,
and bounded historical records. Costs and net profit remain unavailable. Constructed fixture data
is labeled. Current admission requires a confirmed save and unexpired backend evidence; stream
errors/silence, suspension, or elapsed validity remove that presentation. A reconnect fetches current
state and cannot restore expired admission. Historical records preserve original origin and as-of
evidence; they never become current live results after restart.

The backend exposes uncached read-only `/api/v1/current`, `/api/v1/history/observations`,
`/api/v1/history/analyses`, exact revision detail beneath those history paths, and `/api/v1/events`.
Lists default to 20 records and allow at most 100 with stable high-water cursors. `/healthz`
identifies the application/process instance. SSE sends bounded status projections, not a durable
event replay log. These endpoints do not proxy RPC or trigger collection. Financial JSON quantities
remain exact decimal strings with explicit units; no missing value is silently converted to zero.

Only one Pooltrace producer may own a database at a time. The standalone CLI uses the same guard:
stop the service before running the CLI on its file, or choose an isolated diagnostic database.
Ownership uses a `<database>.owner` sidecar held until handles close. A competing or crash-left
marker fails closed. Before manually removing a leftover marker, verify that its producer and
descendants have actually stopped and that the file belongs to the expected database. Never remove
an active marker or a database/journal file to bypass ownership. Keep custom database paths and
their sidecars in an ignored directory such as `data/`, or add suitable local ignore rules.

## PR verification and browser smoke

Accepted [ADR-0009](docs/adr/0009-pr-verification-and-repository-trust.md) defines the CI contract.
The [DEP-02 record](docs/tasks/DEP-02-pr-verification-and-cloud-compatibility.md#implementation-evidence)
distinguishes local macOS/Ubuntu validation, actual GitHub-hosted runs on
[PR #1](https://github.com/mikolajed/pooltrace/pull/1), and repository settings.
The workflow is in `.github/workflows/ci.yml`. The user enabled the `Protect main` ruleset;
readback confirms required PRs, current-base `pr-gate` from GitHub Actions, and no bypass actors.

To run the automated fixture browser/API/native shutdown smoke locally:

```sh
bun run browser:install
bun run test:browser
bun run check:workflow
```

Browser installation downloads the pinned Chromium build; on Linux it also installs required OS
libraries. The smoke uses an isolated source snapshot and frozen dependency installation with no
private `.env`, temporary ports/database, and real application entrypoints. It verifies all 36
rows with exact decimal units, history, stream/suspension withdrawal and native Ctrl+C/SIGTERM
stop/restart. It uses one browser worker and no retries. `bun run check` type-checks these tests;
`bun run test:browser` runs them separately. Routine reports/traces in `ci-results/`, `test-results/`
and `playwright-report/` are ignored; inspect a failure before considering a diagnostic rerun.

CI uses frozen installs, the full checks on Linux/macOS, production build, fixture smoke, pinned
workflow validation and a gate that requires all dependencies to succeed. It receives no private
RPC/model/deployment secrets and performs no merge or deployment. The initial hosted baseline
passed all six checks; protection readback and a blocked failing PR are recorded in the task.
Stale-base integration remains in DEP-02. Contributor identity/tool setup remains
[CONTRIB-01](docs/tasks/CONTRIB-01-shared-pr-contributor-setup.md); the proposed standing
delivery permissions are not enabled by DEP-02.

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

`--format json` emits one `cli-v2` envelope on stdout, without progress or ANSI escapes. Its
`kind` is `result` or `error`; `mode`, `origin`, `constructed`, `status`, `reason`, `asOf` (Unix
milliseconds), `units`, `sizes`, `observation`, `analysis`, `eligibility`, and `persistence` retain evidence and
unavailable values. Bigint quantities, including block numbers and base-unit amounts, are exact
decimal strings. Sizes and cycle-row input/output/gross use 10^-6 USDC. Each leg quote's input/output
units follow its tokenIn/tokenOut; the intermediate leg-1 output uses 10^-18 WETH.
`--help --format json` instead returns `{formatVersion, kind: "help", help}` without reading
configuration. Help accepts only the optional format flag; duplicate/unknown flags, positionals,
or combining help with mode/sizes are usage errors. Bun may print its command banner to stderr;
redirect stdout alone for a JSON document.

| Exit | Meaning |
| --- | --- |
| 0 | Help or a usable result with confirmed saved evidence, including qualified fixture or nonpositive gross results. Fixture success never means live admission. |
| 1 | Runtime, storage, or integrity failure; uncertain save; or rejected/incomplete/stale/invalidated/unavailable analysis. Calculation diagnostics and save status remain separate. |
| 2 | Invalid arguments or configuration, before database/network access. Errors do not echo supplied values. |
| 130 | SIGINT interruption; owned work is cancelled and confirmed prior saves/current save status are reported. Synchronous SQLite waits for control to return before handling the signal. |

Live and fixture sizes use `--sizes` first, then `USDC_INPUT_AMOUNTS`, then the six defaults.
Every override must be a JSON array of exactly six increasing, distinct, positive decimal strings
with at most six places. Both modes load root `.env`, then `.env.local`, then defined process
values (including empty values); fixture mode ignores the live URL/provider settings. Help loads
neither file. No endpoint URL argument is accepted.

Both modes persist by default: live uses `data/pooltrace.sqlite`, fixture uses
`data/pooltrace-fixture.sqlite`. Optional `POOLTRACE_DB_PATH` uses the same environment precedence;
relative paths resolve from the repository root. Omit it to retain separate defaults. An explicit
shared file keeps origins distinct. Empty, URI, and `:memory:` paths are invalid. New parent
directories use mode 0700 and new files 0600; existing permissions are preserved. Use local storage.
Database files and rollback journals are ignored by Git; keep them outside build output.

`persistence.status` is `saved`, `not_saved`, or `unknown`, with a fixed reason or null.
`collectionRevisionId` and `lastSavedAnalysisRevisionId` identify confirmed prior saves;
`observationRevisionId` / `analysisRevisionId` identify the confirmed current write, and
`acknowledgedAt` is its wall time. An uncertain write has no confirmed current IDs/time.
`knownInvalidation` carries a stored witness revision/index when present. Paths and credentials
are excluded. A usable calculation can have a failed save and exit 1; a saved result can expire
before output and also exit 1. The CLI never loops on renewal/writes to manufacture success.

Collection, analysis, and renewal are separate atomic saves retaining immutable history and all
failure outcomes. The store uses DELETE/EXTRA, a 500 ms lock wait, and at most one read-only
reconciliation of an uncertain commit. Filesystem latency is not bounded by that timeout. Do not
delete a database/journal or change its mode to bypass a storage error; preserve it for inspection.
No backup/restore or power-loss guarantee has been validated. See
[ADR-0007](docs/adr/0007-minimal-sqlite-evidence-store.md) and
[M1-10 evidence](docs/tasks/M1-10-minimal-evidence-store.md#implementation-evidence).

Backend exact-version/history reads use bounded metadata pages and mark loaded evidence
historical, preserving original origin/as-of fields and known invalidation. They do not restore
live clocks/admission or a current best. The local API/browser exposes these historical reads;
there is no diagnostic CLI history command or replay loader.
Archived cli-v1 reports remain unchanged historical evidence.

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
