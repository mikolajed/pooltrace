# Proposed roadmap

M1-01 through M1-12 are complete, including verified snapshots, qualified read-only cycle analysis,
diagnostic CLI access, exact SQLite history, the analysis guide, a minimal local API/SSE/browser and
combined startup/shutdown. Further implementation awaits explicit approval.
Approval of one task or milestone does not authorize another.

The next arbitrage research increment uses the completed M1 collector. The CI implementation
is on main. DEP-02 and CONTRIB-01 are closed at the user's request; their closeouts retain the
unverified stale-base experiment and native Cloud environment/PR as explicit limits.
[ADR-0009](adr/0009-pr-verification-and-repository-trust.md) ·
[DEP-02](tasks/DEP-02-pr-verification-and-cloud-compatibility.md) ·
[CONTRIB-01](tasks/CONTRIB-01-shared-pr-contributor-setup.md).

## Milestone planning

Pooltrace is an ongoing product. Define scope, acceptance criteria, dependencies, and any delivery
estimates for individual milestones rather than a fixed project lifespan or feature ceiling.
Review working behavior and evidence as each milestone progresses, then propose the next increment.

[PRODUCT.md](PRODUCT.md) describes the product and current milestone workloads. The sequence below
is a revisable development plan, not the full extent of Pooltrace's future capabilities.

## Core milestone sequence

M1–M5 define the core product capabilities. Research tracks can span several core milestones.
Each track can deliver independently scoped increments and use core capabilities as they become
available. The results inform which core work to scope next.

| Stage | Sequencing | Outcome | Related work |
| --- | --- | --- | --- |
| Setup | Complete | Requirements, documentation system, ADR workflow, backlog, brand reference | SET tasks in [backlog](BACKLOG.md) |
| M1: Local read-only research application | Complete | One backend, minimal UI/CLI access, verified quotes/cycles, early SQLite | M1 tasks in [backlog](BACKLOG.md) |
| PR verification and shared contributions | Records closed at user request with unverified limits | Merged CI, verified local PR delivery and documented native Cloud direction | DEP-02 and CONTRIB-01 closeouts in [backlog](BACKLOG.md) |
| M2: Executor and fork validation | Early arbitrage research informs scope | Guarded execution, meaningful contract tests, full transaction cost evidence | M2 tasks in [backlog](BACKLOG.md) |
| M3: Evidence and recovery hardening | Builds on M1 persistence and M2 simulation records | Richer history/replay, schema evolution, backup/restore, recovery | M3 tasks in [backlog](BACKLOG.md) |
| M4: Research terminal refinement | Builds on the minimal M1 UI and usable evidence | Full route/cost/size inspection, polished states, brand integration | M4 and BR tasks in [backlog](BACKLOG.md) |
| M5: Documentation and reproducibility | Consolidates a reviewable increment; can be revisited | Reproducible setup, explanations, validation evidence, contributor guidance | M5 tasks in [backlog](BACKLOG.md) |

Documentation and validation accompany every milestone; M5 consolidates that evidence and guidance.
Extend and revise the sequence as the product develops.

## M1 — completed local read-only application

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
faults, offline/process checks, and actual live runs.

Completed [M1-11](tasks/M1-11-local-api-sse-and-browser.md#implementation-evidence) and
[M1-12](tasks/M1-12-local-startup-readiness-and-shutdown.md#implementation-evidence) implement
[accepted ADR-0008](adr/0008-local-api-sse-and-process-interface.md). M1-11 supplies the individual
applications/API/browser; M1-12 adds their combined startup workflow using the same process interface.
Their evidence includes clean setup/build, actual browser/API/live checks and native shutdown of
the real applications, separately from controlled process fixtures.

[ADR-0004](adr/0004-local-processes-and-gated-deployment.md) selects a local UI application and one
backend process with collection/analysis/RPC/API modules. The implemented SQLite/API/browser and
CLI share backend behavior and exclusive per-database producer ownership.

M1 provides reproducible read-only cycle analysis, stored provenance, a minimal local browser
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

## ARB — arbitrage research track

ARB is a core product priority pursued through research milestones of its own. Start with
the M1 collector and Ethereum quotes. Use each increment to work out whether the next one is
worth doing and which experiments to prioritize. The research uses live read-only observation
and local fork experiments. [ARB tasks](BACKLOG.md#arb--arbitrage-research-track).

| Research milestone | Core dependency | Deliverable |
| --- | --- | --- |
| Opportunity discovery | Completed M1 collector and quote engine | Measure baseline yield and freshness, compare a bounded pool or size expansion, and identify recurring positive-gross candidates or record the coverage and timing gaps that merit another experiment. |
| Full-cost validation | Local fork and cost evidence as M2 develops | Shortlist routes and measure quoted versus executed output and net after full transaction costs in recorded fork states. Use the results to refine route selection and M2 scope. |
| Timing and wider coverage | Fork tooling for intra-block replay, with M3 history/replay where needed | Measure whether added venues or earlier observation expose more candidates. Test public mempool timing in read-only shadow mode if replay finds a recurring signal. |

The live collector selects the provider's latest mined block at the start of an attempt and pins
all reads to its hash. It sees end-of-block state, so a price gap opened by one swap and closed
later in the same block can be invisible even at zero head lag. Collection can also finish after
the head has advanced. One archived CLI run found a best tested gross of −0.024121 USDC on a
10 USDC input, with costs unavailable. That sample covers three USDC/WETH pools and six sizes.
Treat competition, limited venue coverage, and sizing as hypotheses to test.
[Archived CLI run](ANALYSIS.md#reading-an-actual-archived-cli-result).

### Candidate experiments

1. **Measure the baseline and freshness.** Use a predetermined window of consecutive blocks and
   keep the current pools and sizes as a control. Report how many blocks were seen, qualified,
   missing, or stale, and how many qualified blocks produced positive gross. Record observed head
   arrival, quote completion, head lag at completion, and RPC use. If polling misses blocks or
   leaves too little time to finish, compare new-head-triggered collection with polling on the
   same workload. Keep hash pinning, reorg handling, and completeness checks.
2. **Add pools using existing adapters.** Check additional Uniswap V3 USDC/WETH fee tiers first.
   Verify deployment, fee, token behavior, and finite-size depth before quoting. Compare coverage
   with the three-pool baseline at identical block hashes and input sizes. Then test a broader size
   grid around promising routes as a separate experiment. Keep qualification and exact amount
   accounting in place.
3. **Add one venue, then consider more hops.** Rank Ethereum venue candidates by overlapping
   liquidity, swap activity, fees, and the cost of reliable quoting. Evaluate a venue with a
   compatible pool model first if it has meaningful depth, or evaluate a distinct model such as
   Curve if the data supports it. Verify the venue's actual quote semantics against deployed
   behavior. Measure the incremental result on the same blocks before adding vetted token pairs
   and bounded three-hop USDC cycles. Count added quote calls and gas alongside added candidates.
   Scope these increments when baseline measurements show where extra coverage may help.
4. **Replay transaction boundaries before observing pending swaps.** On a local fork of a
   recorded parent block, replay a block's transactions in canonical order and quote immediately
   after selected swaps. Compare the same routes before the swap, after it, and at block end.
   Reconcile the replay with canonical state and record the transaction index. This tests whether
   gaps existed inside the block. The recorded transaction order supplies hindsight. Measuring
   when a live observer could detect a gap requires prospective observations.
5. **Evaluate the public mempool in shadow mode if replay justifies it.** Check feed capabilities
   and measure first-seen time, simulation completion, and overlap with subsequently mined swaps.
   Simulate an observed swap followed by a candidate cycle on a fork of the head known at
   observation time. Record the assumed order and check it against eventual inclusion. Track
   missing/private order flow where it can be identified, replacements, reverts, reorgs, and
   opportunities that disappear before analysis finishes. Results are conditional on the feed
   and assumed ordering. This experiment is read-only against the live network.

### Evidence and decisions at each milestone

- Report the share of qualified states with at least one positive-gross cycle, the distribution
  of gross USDC after pool fees and price impact, and the best tested size. Record block hashes,
  pool and size configurations, rejected results, observation latency, and RPC cost. Include
  zero-yield windows and repeat any promising result on a fresh window.
- If positive gross repeats with enough margin to justify cost validation, scope a bounded
  local fork experiment as the relevant M2 capabilities become available. Compare quoted and
  executed output for shortlisted candidates, apply complete transaction costs in USDC, and
  include any modeled inclusion payments. Keep net unavailable until matching cost evidence
  exists. A positive simulated net applies to that fork state and ordering.
  [CR-06](CORRECTNESS.md#cr-06--net-profitability-and-transaction-costs).
- Set the sample windows, minimum coverage, latency targets, and resource budget for each
  experiment. Close each research milestone with reproducible evidence and a decision to
  continue, revise, or pause that line of work. Use recurring gross margins to prioritize M2
  validation. Use recurring positive simulated net and measured detection timing to judge
  further investment. Record remaining uncertainty about inclusion and competition.

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

## PR verification before further feature work

The requested contribution direction supports independently operated tools through the same
branch/PR/review rules, maintained in [WORKFLOW.md](WORKFLOW.md#proposed-shared-pr-contributions).
DEP-02 establishes the CI foundation, Linux/macOS compatibility and fixture integration checks.
CONTRIB-01 delivered the native onboarding direction/documentation. Both records are closed at
the user's request with unverified integration checks preserved. Actual native Cloud execution and
any later contributor path need separately approved verification; standing delivery permissions
remain inactive. Passing CI remains evidence for human review rather than authority to merge or deploy.

## Future deployment and CI/CD

Use the implemented localhost architecture and merged PR verification workflow. Unperformed setup
checks remain explicit in the closed task records; release
packaging, isolated staging validation, explicit production authorization, health checks and
recovery/rollback remain future work. [DEPLOYMENT.md](DEPLOYMENT.md) owns that environment plan.

ADR-0009 selects GitHub Actions and PR gates. Choose hosting, production process management,
migration procedures and rollout strategy in a future deployment ADR. DEP backlog tasks do not
authorize workflows, infrastructure, or a
production update. Hosting preserves the transaction-execution boundaries of the approved milestone.
