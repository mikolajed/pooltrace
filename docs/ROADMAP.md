# Proposed roadmap

M1-01 through M1-08 are complete, including verified snapshots, qualified read-only cycle analysis,
diagnostic live/fixture CLI access, focused arithmetic/failure validation, and the analysis guide.
M1-09 design delivery is complete with [accepted ADR-0007](adr/0007-minimal-sqlite-evidence-store.md);
M1-10 implements the minimal store and cli-v2 persistence. Further implementation awaits explicit approval.
Approval of one task or milestone does not authorize another.

## Milestone planning

Pooltrace is an ongoing product. Define scope, acceptance criteria, dependencies, and any delivery
estimates for individual milestones rather than a fixed project lifespan or feature ceiling.
Review working behavior and evidence as each milestone progresses, then propose the next increment.

[PRODUCT.md](PRODUCT.md) describes the product and current milestone workloads. The sequence below
is a revisable development plan, not the full extent of Pooltrace's future capabilities.

## Milestone sequence

| Stage | Sequencing | Outcome | Related work |
| --- | --- | --- | --- |
| Setup | Complete | Requirements, documentation system, ADR workflow, backlog, brand reference | SET tasks in [backlog](BACKLOG.md) |
| M1: Local read-only research application | First implementation milestone | One backend, minimal UI/CLI access, verified quotes/cycles, early SQLite | M1 tasks in [backlog](BACKLOG.md) |
| M2: Executor and fork validation | Builds on verified cycle analysis | Guarded execution, meaningful contract tests, full transaction cost evidence | M2 tasks in [backlog](BACKLOG.md) |
| M3: Evidence and recovery hardening | Builds on M1 persistence and M2 simulation records | Richer history/replay, schema evolution, backup/restore, recovery | M3 tasks in [backlog](BACKLOG.md) |
| M4: Research terminal refinement | Builds on the minimal M1 UI and usable evidence | Full route/cost/size inspection, polished states, brand integration | M4 and BR tasks in [backlog](BACKLOG.md) |
| M5: Documentation and reproducibility | Consolidates a reviewable increment; can be revisited | Reproducible setup, explanations, validation evidence, contributor guidance | M5 tasks in [backlog](BACKLOG.md) |

Documentation and validation accompany every milestone; M5 consolidates that evidence and guidance.
Extend and revise the sequence as the product develops.

## M1 — first proposed implementation milestone

The separately approved [M1-01 foundation](tasks/M1-01-tooling-and-workspaces.md) is complete under
accepted ADR-0001. [M1-02](tasks/M1-02-registry-and-consistent-snapshots.md) produced accepted
[ADR-0005](adr/0005-registry-verification-and-consistent-snapshots.md). The separately approved
[M1-03 implementation](tasks/M1-03-registry-and-consistent-snapshots.md) has offline and live evidence
for identity, structural screening, and consistent snapshots; finite-size qualification is recorded
separately by M1-05.
[M1-04](tasks/M1-04-quotation-cycles-and-profitability-design.md) produced accepted
[ADR-0006](adr/0006-quotation-cycles-and-profitability.md) for quotation, qualification, cycles, and
profitability semantics. The separately approved [M1-05 implementation](tasks/M1-05-quotation-and-cycle-analysis.md)
has offline/live admission, quotation, composition, and ranking evidence.
[M1-06](tasks/M1-06-cli-and-configuration.md) adds a one-shot CLI over the shared backend with
explicit live/fixture modes and exact text/JSON output. Full transaction costs
and net-profit evidence remain unavailable pending a reviewed producer.
[M1-07](tasks/M1-07-validation-and-regression-coverage.md) adds independent arithmetic vectors,
asymmetric direction/unit checks, and running-analysis failure regressions without changing
production behavior. Detailed work
and acceptance criteria live in the [backlog](BACKLOG.md) and its linked task records.
[M1-08](tasks/M1-08-mathematics-and-evidence-documentation.md) connects the implemented math,
assumptions, commands, result states, and actual evidence through the [analysis guide](ANALYSIS.md).
[M1-09](tasks/M1-09-minimal-sqlite-design.md) delivers accepted ADR-0007 and its paper/research
evidence. [M1-10](tasks/M1-10-minimal-evidence-store.md#implementation-evidence) implements the
store, exact immutable history, atomic saves and cli-v2; its evidence separates native/injected
faults, offline/process checks, and actual live runs. API/browser access and process lifecycle
remain separately gated M1-11/M1-12.

Proposed [M1-11](tasks/M1-11-local-api-sse-and-browser.md) and
[M1-12](tasks/M1-12-local-startup-readiness-and-shutdown.md) now have reviewable scopes under
[proposed ADR-0008](adr/0008-local-api-sse-and-process-interface.md). M1-11 supplies the individual
applications/API/browser; M1-12 adds their combined startup workflow using the same process interface.
M1-12's final validation depends on the actual M1-11 apps, not process fixtures alone.

[ADR-0004](adr/0004-local-processes-and-gated-deployment.md) selects a local UI application and one
backend process with collection/analysis/RPC/API modules. Review a minimal SQLite schema/driver and
persist observations/results from the first working backend. Add a narrow API/SSE/browser view and
keep CLI access tied to the same backend behavior; no independent duplicate collector is needed.

M1 should end with reproducible read-only cycle analysis, stored provenance, a minimal local browser
view, diagnostic CLI access, and documented limitations. It works without Anvil. Net profit cannot
be claimed without the evidence required by [CR-06](CORRECTNESS.md).

## Later milestones

M2 should resolve executor security, selected routers, local fork orchestration, and ETH-to-USDC cost
valuation before implementation. Contract surplus and caller gas remain separate.
Anvil is a separate on-demand local process, with one active fork job initially; add persisted
simulation evidence when execution exists.

M3 extends the existing store with richer history/replay, reviewed schema evolution, and demonstrated
backup/restore/recovery. Preserve exact amounts, provenance, failures, and invalidations. It no
longer introduces the first database: ADR-0004 moves that work into M1 while retaining the SQLite
choice from [ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md).

M4 should consume actual evidence and emphasize empty, stale, incomplete, rejected, and simulated
states. It refines the minimal M1 interface into the full terminal. Produce approved kingfisher
assets before integrating the brand.

M5 should make claims match evidence: no invented live results, no capture guarantees from forks,
and no description of testing as formal verification.

## Continuing development

Review the outcome of each milestone, refine the research workflow, and prioritize further work with
the user. The [future-milestone backlog](BACKLOG.md) records candidate capabilities and infrastructure
changes, without defining a permanent boundary on the product.

Replan milestone scope or estimates explicitly as needed. Keep approved work correct, usable, and
documented. Each subsequent implementation scope still requires approval.

## Planned backend evolution

The accepted direction in [ADR-0002](adr/0002-typescript-first-and-measured-evolution.md) is to start
with a TypeScript application and plan a later upgrade, potentially combining Rust, TypeScript,
and Python:

1. Establish a working, validated TS backend and frontend, with Solidity/local forks for execution.
2. Preserve versioned evidence and reference cases, then record a reproducible TS benchmark baseline
   before comparing replacements.
3. Propose and, when authorized, migrate backend components toward Rust, potentially replacing the
   TS backend while keeping the TypeScript frontend.
4. Add Python research tools when an identified analysis task benefits from them; their exact
   integration and timing remain open. They are not a prerequisite for a Rust migration.
5. Compare correctness, performance, resource use, and operational tradeoffs before adopting a
   replacement. Retain the TS reference and disclose regressions as well as improvements.

The [benchmark plan](BENCHMARKING.md) owns the proposed methodology. Migration timing and scope
belong to separately reviewed milestones. The current TypeScript milestone does not require three
running backend services. Defined milestone boundaries remain in force until explicitly revised.

## Planned storage evolution

After a working SQLite evidence store exists, evaluate storage changes independently of backend
language changes. [ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) keeps PostgreSQL as an
operational-store candidate, ClickHouse as an analytics candidate, Parquet as a dataset format, and
bucket/object storage as a possible home for datasets and artifacts.

Identify a concrete workload and adoption criteria before adding or replacing a component. Preserve
versioned exports and verify migration, result parity, recovery, and rollback. Compare relevant
workloads under [BENCHMARKING.md](BENCHMARKING.md), including resource and operating costs.

This is room for continued growth, not a requirement to deploy every candidate or a fixed sequence
of database upgrades. STORE/BENCH backlog items remain unapproved future work.

## Planned RPC resilience and chain expansion

Begin with the user's Alchemy Ethereum endpoint under ADR-0005's single-provider policy. Later,
design and implement multiple-provider fallback and additional-chain increments through their
own reviewed milestones. Their order and timing remain open. [PRODUCT.md](PRODUCT.md) records
the direction; RPC-01/02 and CHAIN-01 in
[the backlog](BACKLOG.md) track the future work. Provider/chain growth must preserve the relevant
state consistency, provenance, and explicit failure semantics. It does not expand M1-03's scope.
M1-03 keeps RPC access inside the backend behind a distinct module boundary. RPC-01 will evaluate
extracting that module into a separate gateway process; the initial application topology remains
the one selected in ADR-0004.

## Future deployment and CI/CD

Use the localhost architecture first. Later, introduce reproducible automated checks, release
artifacts, isolated staging validation, explicit production authorization, health checks, and
recovery/rollback. [DEPLOYMENT.md](DEPLOYMENT.md) owns the draft environment/pipeline plan.

Choose hosting, process management, CI provider, concrete gates, migration procedures, and rollout
strategy in a future ADR. DEP backlog tasks do not authorize workflows, infrastructure, or a
production update. Hosting preserves the transaction-execution boundaries of the approved milestone.
