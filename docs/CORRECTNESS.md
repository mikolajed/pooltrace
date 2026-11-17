# Correctness requirements

These requirements come from the user's project brief. They define what must hold; ADRs select
the mechanisms, and approved tasks provide verification evidence. Task records identify the
implemented portions and remaining gaps; M1-03 supplies registry/snapshot evidence without full
CR-02 finite-size qualification. Stable IDs let tasks and checks refer to requirements without copying them.

## CR-01 — Amounts, units, and rounding

Use bigint for token amounts and explicit fixed-point arithmetic for calculations. Make token
decimals and units explicit; do not mix USDC base units, WETH base units, wei, gas units, and prices.
Specify rounding direction at arithmetic boundaries. Floating-point formatting is acceptable only
at the presentation boundary.

In the initial TypeScript application, use native bigint. Any future replacement of authoritative
financial calculations must preserve exact integer/fixed-point semantics and explicitly verify
rounding, range, and overflow behavior; a language change does not relax this requirement.

## CR-02 — Verified registry and liquidity

Verify Ethereum deployment and token addresses, pool identity, and suitable liquidity before
configuring M1's V2 pool and two selected V3 fee tiers. Document authoritative sources and
the liquidity admission assumptions. Do not invent addresses or silently replace a selected venue.

## CR-03 — Consistent snapshots

Read all quotes in a same-chain comparison against one consistent block. Record chain ID, block
number, block hash, block timestamp, and observation time. Handle stale data, partial RPC failures,
and invalidated snapshots explicitly. The snapshot ADR must define how consistency, age, and
invalidation are checked and what happens when validation is unavailable.

## CR-04 — Protocol quotation

For M1, implement V2 quotation mathematics and compare it against protocol behavior. Use the official
V3 quoter for that milestone; do not recreate V3's complete swap engine. Correct quotations already
include protocol fees and price impact; do not subtract those costs again.

## CR-05 — Complete cycles and tested sizes

For M1's workload, compose USDC → WETH → USDC through different pools. The second leg must use the
first leg's output. Evaluate both venue orderings for each pool pair at six configurable input amounts.
With three admitted pools, that is six directed routes and 36 route/size combinations.

Report the best tested size, with the metric used to rank it. Do not claim a global optimum.
Do not present a best gross quotation as proof of net profitability.

## CR-06 — Net profitability and transaction costs

For M1/M2's USDC-starting cycles:

```text
estimated net profit = final USDC − initial USDC − estimated transaction costs valued in USDC
```

Estimate the complete executor transaction's cost. Quoter gas estimates are not a substitute.
Missing costs must appear as unavailable, never silently as zero. Document the source, timestamp,
units, and assumptions used to convert ETH transaction costs into USDC.

Treat slippage tolerance as an execution constraint, not an extra profit deduction. Contract-level
surplus excludes caller gas; include caller gas separately in off-chain profitability.

## CR-07 — Executor safety

For M2, use a small single-owner, prefunded executor with explicitly supported tokens and routers.
Enforce:

- Authorized execution.
- Expiration.
- Per-leg minimum outputs.
- A minimum final surplus in the starting token.
- Preservation of pre-existing intermediate-token balances.

Measure starting-token balances immediately before and after the cycle, before withdrawals:

```text
ending balance >= starting balance + required surplus
```

Document external-contract assumptions and the security properties being tested.

## CR-08 — Fork execution boundary

The currently defined execution milestone, M2, executes transactions only on local forks. A future
live-execution capability requires a separately reviewed milestone and design with explicit
authorization. A successful fork simulation validates execution against its selected state. It does
not establish that the opportunity could have been captured before competitors. Do not imply
historical capture or live execution from fork results.

## CR-09 — Evidence and honest states

Preserve observations and simulation results. Distinguish live observations, calculated candidates,
fork simulations, and constructed demo scenarios in stored evidence and presentation. Show clear
stale, incomplete, rejected, and simulation states and an honest empty state when no profitable
candidates exist.

When RPC access is unavailable, use clearly labeled local-development fixtures and state which
integration checks remain unverified. Never invent APIs, successful test results, or market data.

## CR-10 — Meaningful validation

Verify arithmetic, token ordering, rounding, and cycle composition in M1. Add
meaningful unit, fuzz, invariant, and fork tests for the executor. Record what actually ran and
what remains unverified. Testing alone is not formal verification; formal proofs are future work.

## CR-11 — Financial presentation

Keep green/red meaningful for profit/loss. Label stale and incomplete data explicitly. Distinguish
quoted versus simulated outputs and unavailable versus known costs. A displayed number must be
traceable to its provenance and stated assumptions.
