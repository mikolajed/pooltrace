# Engineering conventions

These are requirements and working conventions for future approved implementation. They do not
authorize code or dependency installation.

## Tooling baseline

| Area | User-specified direction | Decision still needed |
| --- | --- | --- |
| Package management and commands | Bun; version and lockfile policy below | Review upgrades when changing the toolchain |
| Initial application | TypeScript backend and frontend; Node.js backend runtime and workspace boundaries under [ADR-0001](adr/0001-project-boundaries-and-tooling.md); foundation pins below | Package-specific build configuration as approved applications are introduced |
| EVM interaction | viem 2.57.20 installed and verified under accepted [ADR-0005](adr/0005-registry-verification-and-consistent-snapshots.md) and [ADR-0006](adr/0006-quotation-cycles-and-profitability.md) | Reviewed executor integration remains M2 work |
| Contracts and local forks | Solidity, Foundry, Anvil | Compiler/dependency versions, router APIs, and local execution design |
| TypeScript tests | Vitest 5.1.0; Playwright Test 1.65.1 / Chromium for fixture browser integration in DEP-02 | Initial hosted baseline passed; source-bound main ruleset active; further integration proof pending |
| Evidence persistence | better-sqlite3 13.2.0 / SQLite 3.54.1 under accepted [ADR-0007](adr/0007-minimal-sqlite-evidence-store.md); backend implementation in M1-10 | Other-platform verification and M3 hardening |
| Terminal | Next.js 16.4.6 / React 19.3.1 and SSE in M1-11; plain CSS for the minimal browser | Tailwind/shadcn and terminal refinement remain M4 work |
| Local runtime topology | UI application + one backend and embedded SQLite; macOS/Linux foreground launcher | Later fork toolchain under [ADR-0004](adr/0004-local-processes-and-gated-deployment.md) |

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
The web app uses bundler module resolution, ES2024/DOM libraries and React JSX. Its type-check
helper generates Next production route/ambient types before checking, excludes duplicate dev
output and disables incremental cache reuse. Generated `next-env.d.ts` is ignored.

Biome includes TypeScript, TSX, CSS and JSON files, respects `.gitignore`, uses two-space
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

`bun run check` covers tooling, all packages and the web app, lint/formatting, and offline tests. Explicit
live commands use the configured endpoint; `bun run check:live` writes ignored integration reports.
SQLite was deferred from M1-03 and is now implemented in M1-10. M1-11 adds the minimal frontend;
Foundry remains later work.

## Quotation integration

M1-05 adds the private `@pooltrace/domain` workspace and workspace dependencies only; no external
dependency version changes. Its pure functions receive explicit amounts, state, evidence, and
time inputs. Protocols owns Router02 comparison and QuoterV2 ABI calls; backend owns analysis
attempts, clocks, eligibility, and validation. Root TypeScript checks include all three packages;
Vitest discovers their actual offline tests.

The existing bounded reader now accepts quote-only logical/send limits, reserved final reads, and
a state-dispatch gate. M1-03's defaults are preserved. Three quote workers leave a semaphore slot
for renewal; quotes and control requests share the same four-request reader, deadline, and send
budget. The gate runs on actual state sends, including retries. No extra provider session bypasses
those limits. Evidence counts logical reads separately from actual sends.

`QUOTE_SOURCE` retains sourced deployments, retrieval date, and exact reviewed public repository
revisions for V2 periphery, V3 periphery, and V3 core. Source links are pinned to those commits.
Runtime-code hashes and factory/wrapped-token checks are observation evidence, not a claim that
deployed bytecode was independently reproduced or audited from those source revisions. Runtime and
wire compatibility are checked through actual viem calls and the live integration gate.

The domain's conditional cost function validates supplied model/context evidence, exact valuation,
units, freshness, and rounding. It generates no gas estimate or cost evidence. The analysis backend
accepts no live cost override and always reports unavailable transaction costs/net profit for this
slice. This preserves ADR-0006's staged cost boundary.

The explicit `bun run check:quotes:live` harness verifies a fresh admitted grid and elapsed expiry
before independent historical replay. Each eligibility record is as-of its own event. Setup is in
the [README](../README.md#development-setup); actual source revisions, commands, results, and
limitations are in [M1-05 evidence](tasks/M1-05-quotation-and-cycle-analysis.md#evidence-and-handoff).

## Diagnostic CLI

M1-06 adds the root `bun run cli` command, executing `apps/backend/src/cli.ts` on pinned Node.
Node's built-in `util.parseArgs`, `util.parseEnv`, filesystem/path APIs, and `AbortController`
provide the entry point without new dependencies or a CLI framework. Strict parsing rejects
unknown/duplicate options and positionals. Private environment values never enter output.
[Node argument parsing](https://nodejs.org/api/util.html#utilparseargsconfig),
[Node signal handling](https://nodejs.org/api/process.html#signal-events); consulted 2026-11-18
and verified on the pinned runtime, without changing dependency versions.

The runner delegates collection, analysis, use-time renewal, and eligibility to existing backend
functions. JSON serialization uses the shared exact bigint serializer; text formatting uses integer
division/remainders. The owned SIGINT listener forwards cancellation and is removed on completion.
No application service, storage writer, retry at another block, or independent collector is added.

Constructed wire transports now live in `@pooltrace/protocols/fixtures`; test modules re-export
them. Only explicit fixture mode dynamically imports this subpath. Its fixed block timestamp and
synthetic pools/state are diagnostics. Constructed V2 replies reuse domain arithmetic; V3 replies
use a fee-adjusted marginal reference rather than simulating swaps. Neither is an independent
protocol oracle. Existing domain vectors and M1-05 live/replay evidence retain that separate role.

The [README](../README.md#diagnostic-cli) owns commands, configuration precedence, JSON units,
output states, and exit codes. Root checks cover the real entry point and shared fixture source.
[M1-06 evidence](tasks/M1-06-cli-and-configuration.md#evidence-and-handoff) records offline/process
cases, real SIGINT, clean installation, and actual read-only live text/JSON runs.

## Baseline research integration

Approved ARB-01 adds a bounded research command inside the backend over the existing CLI pipeline,
producer guard and evidence store. Optional phase/logical-read hooks and local retry dispatch
metadata support measurement; absent hooks preserve ordinary service behavior and no dispatch
metadata enters HTTP bodies or headers. The experiment uses one shared transport send/concurrency
limit with priority for queued pipeline work, including complete response-body consumption.

Versioned timing/manifest/header artifacts reference exact existing SQLite revisions. The offline
reporter opens SQLite through the native read-only connection and verifies stored calculations
and recorded completion-time eligibility; it never restores current live admission or invokes RPC.
No dependency or schema version changed. The [ARB-01 record](tasks/ARB-01-baseline-yield-and-freshness.md)
owns protocol settings, actual validation and experiment evidence; the root README owns commands.

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

[M1-10](tasks/M1-10-minimal-evidence-store.md#implementation-evidence) implements accepted
[ADR-0007](adr/0007-minimal-sqlite-evidence-store.md): better-sqlite3 13.2.0 on the unchanged Node
pin, the owned narrow vendor facade, exact typed canonical documents, immutable versions/terminal
witnesses, atomic saves, bounded historical reads, version-1 initialization, and cli-v2 persistence.
SQLite is 3.54.1 on the verified macOS arm64 host; no added install-script trust was needed.
DELETE/EXTRA, foreign keys, trusted schema OFF, and 500 ms lock waiting are verified per connection.
Unit/process tests use temporary files/roots; ordinary test runs must not write default evidence
files. The task separates native-file faults, injected errors, actual live evidence, and unverified
power-loss/other-platform behavior. There is no retention, backup/recovery automation, or benchmark.

## Local execution and future releases

[Accepted ADR-0008](adr/0008-local-api-sse-and-process-interface.md) is implemented by
[M1-11](tasks/M1-11-local-api-sse-and-browser.md#implementation-evidence) and
[M1-12](tasks/M1-12-local-startup-readiness-and-shutdown.md#implementation-evidence): local
API/SSE/browser, per-database CLI/service producer exclusion, identity-bearing readiness and
foreground startup/shutdown. DEP-02 additionally verifies Ubuntu 24.04 arm64 native processes;
Windows remains unsupported. The README owns commands, configuration and manual stale-owner precautions.

The private web workspace pins Next.js **16.4.6**, React/react-dom **19.3.1** and their type packages
at **19.3.0**. No component framework or install-script trust was added. Official
[Next installation](https://nextjs.org/docs/app/getting-started/installation),
[Next CLI](https://nextjs.org/docs/app/api-reference/cli/next) and
[React versions](https://react.dev/versions), registry/installed metadata and actual checks/build
were consulted on 2026-11-18. These are the tested versions, not a claim of latest releases.

The browser reads public runtime configuration only. Backend/native modules, RPC values and
database paths never enter its runtime import graph. Current eligibility comes from an uncached
backend response with conservative request-start expiry; SSE loss/silence or page suspension
withdraws current presentation. Historical records retain their original evidence and cannot
restore admission. Backend collection is serial and independent of all HTTP/browser requests.

The offline suite has 300 tests across 14 files and uses at most two workers. Service time-fault
checks inject an explicit clock instead of widening financial freshness limits. Process tests use
isolated ports/files and owned child groups. The tasks distinguish controlled faults from actual
browser/native signals/live RPC evidence and record a clean credential-free frozen install/check
and production web build.

[ADR-0004](adr/0004-local-processes-and-gated-deployment.md) selects separate UI/backend application
processes on localhost. Collection, RPC, analysis, storage, API, and SSE are backend modules rather
than independent services. The backend owns SQLite access; Anvil is a separate on-demand process
introduced with M2, initially one fork job at a time. CLI access must not create another independent
collection or calculation authority.

[DEPLOYMENT.md](DEPLOYMENT.md) owns process lifecycle and the draft future CI/CD/environment plan.
Keep checks reproducible locally before automating them. Hosting remains future work; DEP-02's
initial hosted baseline passed and the user enabled the main-branch ruleset. Passing CI does not
authorize a production change. Preserve data separately from
release artifacts and verify migration/recovery behavior before a hosted rollout.

## PR verification implementation

[Accepted ADR-0009](adr/0009-pr-verification-and-repository-trust.md) defines one check contract for
all contributors. [DEP-02](tasks/DEP-02-pr-verification-and-cloud-compatibility.md#implementation-evidence)
delivered the merged workflow, an explicit all-required-success gate, syntax/policy validation,
candidate/native metadata and a real fixture browser/API/native-signal smoke. The initial hosted
baseline passed all six jobs on GitHub's Ubuntu 24.04 x64 and macOS 15 arm64 runners. The task
records actual run/candidate IDs separately from local VM results. The user enabled an active
main-branch ruleset with required PRs, strict `pr-gate` from GitHub Actions and no bypass actors.
Failed current checks are reported as merge-blocking; stale-base integration remains unverified.

Exact added development pins are `@playwright/test` **1.65.1** and `yaml` **2.9.1**, with matching
Chromium build **1255** (Chrome for Testing 159.0.8154.6). No existing runtime/dependency pin or
install-script trust changed. Official registry metadata and [Playwright CI guidance](https://playwright.dev/docs/ci)
were consulted on 2026-11-18. Browser tests use one worker, no retries, frozen dependencies in a
temporary source snapshot, explicit fixture mode and an independent string-based decimal oracle.
Private configuration and runtime databases are excluded from the snapshot and uploaded artifacts.

Actions use exact verified release commit SHAs; the task records their release/source mapping.
Actionlint **1.7.12** is downloaded from its official release and verified by the selected asset's
SHA-256 before execution. The local policy checker additionally verifies required jobs, events,
gate dependencies, pinned actions, timeouts, credential handling and read-only permissions.
Nineteen regression cases cover gate failures/missing/skipped/cancelled states and weakened workflow
mutations, including YAML `if: false`. These checks help review; CI code itself still needs human scrutiny.

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

The [analysis guide](ANALYSIS.md) explains implemented calculations, exact worked examples, result
states, and how to inspect evidence. The [root README](../README.md) owns setup/commands; ADRs own
decisions, and individual task records own actual validation outcomes.
