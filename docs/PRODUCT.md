# Product brief

This document captures the user's requirements. It describes future work and does not authorize
implementation. Changes to scope and architecture are reviewed through ADRs.

## Product purpose

Pooltrace investigates whether apparent arbitrage survives finite trade sizes, transaction costs,
and execution simulation. It should monitor real markets, evaluate complete cycles, preserve the
evidence behind calculations, and validate selected candidates on local mainnet forks.

Pooltrace is an ongoing product with room to expand its markets, protocols, execution models,
research capabilities, and infrastructure. There is no fixed project completion date or permanent
feature ceiling. Bound scope, acceptance criteria, and any delivery estimates to individual
milestones; review subsequent work as the product develops.

## Current milestone workloads

### M1 — local read-only research application

- Ethereum mainnet market observations; WETH/USDC only.
- One Uniswap V2 pool and two selected Uniswap V3 fee tiers.
- Verify deployments, token addresses, pool identity, and suitable liquidity before configuring pools.
- Two-swap cycles through different pools, starting and ending in USDC.
- Both venue orderings for every pool pair, across six configurable input amounts.
- Report the best tested size; do not claim a global optimum.
- Persist observations, quotations, calculated cycles, and their provenance in SQLite.
- Provide minimal browser/API access and a diagnostic CLI over shared backend behavior.
- Keep M1 read-only; it does not execute transactions.

### M2 — executor and fork validation

- Build and validate the prefunded executor against the M1 workload on local forks.
- Record simulation outputs, transaction costs, failures, and the evidence behind them.
- Execute only on local forks within this milestone.

### Subsequent milestones

M3 covers evidence/replay/recovery hardening, M4 refines the research terminal, and M5 consolidates
documentation and reproducibility. [ROADMAP.md](ROADMAP.md) and [BACKLOG.md](BACKLOG.md) own their
delivery sequence and detailed work.

Other chains, Curve, cross-chain inventory analysis, flash loans, Starknet, and live trading are
possible future milestone topics. They are not excluded from the product; each needs a separately
reviewed scope, design, and implementation approval.

## Engineering and correctness

The tooling baseline and technical conventions live in [ENGINEERING.md](ENGINEERING.md).
The proposed workspace/runtime choice lives in [ADR-0001](adr/0001-project-boundaries-and-tooling.md).

Start with a TypeScript backend and frontend, retaining Solidity for the execution contract. Plan
for a later, potentially Rust/TypeScript/Python system through subsequent milestones.
Backend replacement and additional research tooling should preserve validated behavior and
be benchmarked against the working TS version. The accepted direction and remaining design choices
are recorded in [ADR-0002](adr/0002-typescript-first-and-measured-evolution.md).

Use SQLite for initial persistence. Keep room to replace or complement it with PostgreSQL,
ClickHouse, Parquet datasets, or object storage as operational and research needs emerge.
[ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) separates their possible roles and
migration criteria. Those storage additions are candidates for later milestones.

Run the first working application on localhost with a UI process and a separate TS backend. The
backend owns live RPC collection, analysis, API updates, and minimal SQLite persistence in M1.
Anvil is a separate on-demand process when M2 introduces fork execution. The CLI remains a diagnostic
entry point to shared backend behavior. See
[ADR-0004](adr/0004-local-processes-and-gated-deployment.md).

Hosted deployment and CI/CD are future work. Plan checks and staging validation before explicitly
approved production changes, with health checks and recovery/rollback. [DEPLOYMENT.md](DEPLOYMENT.md)
owns that plan. Hosting does not change a milestone's authorized transaction scope.

[CORRECTNESS.md](CORRECTNESS.md) is the canonical source for financial and execution requirements:
amounts and rounding (CR-01), verified registry (CR-02), consistent snapshots (CR-03), protocol
quotes (CR-04), full cycles and tested sizes (CR-05), net costs (CR-06), executor safety (CR-07),
fork limitations (CR-08), evidence/states (CR-09), validation (CR-10), and financial presentation
(CR-11). Task criteria and ADRs must refer to those requirements rather than redefine them.

## Interface and brand

Use a readable professional research terminal with restrained cyberpunk character. The supplied
perched kingfisher and its asset constraints are preserved in the [brand reference](brand/README.md).
The palette may be refined instead of copying every preview color.

Prioritize the opportunity table, route inspector, trade-size sensitivity chart, cost breakdown,
block provenance and age, quoted versus simulated outputs, and clear simulation/rejection states.
Financial color and status semantics are defined by CR-11 in the correctness document.

## Delivery requirements for approved implementation

Provide working code, setup instructions, `.env.example`, and documentation of mathematics and
assumptions as approved milestones are delivered. The [workflow](WORKFLOW.md) defines approval and
handoff; [engineering conventions](ENGINEERING.md) define dependency research and verification
reporting. Users and contributors should be able to reproduce the results and understand their
assumptions and limitations.
