# 0006: Quotations, finite-size admission, and cycle profitability

- Status: Proposed
- Proposed on: 2026-11-17
- Decision accepted by user: Not yet
- Related task: [M1-04](../tasks/M1-04-quotation-cycles-and-profitability-design.md)
- Future implementation: M1-05, separately scoped and approved
- Requirement IDs: CR-01 through CR-06, CR-09, CR-10 in [CORRECTNESS.md](../CORRECTNESS.md)
- Supersedes / superseded by: None; extends accepted [ADR-0005](0005-registry-verification-and-consistent-snapshots.md)

## Context

M1-03 supplies verified identities, structural state, and consistent observations. It deliberately
leaves finite-size suitability unavailable and workload admission false. M1 now needs a precise
meaning for a qualified quote, a two-pool cycle, its best tested size, and unavailable net profit.

The requirements already select Ethereum USDC/WETH, one V2 pool, V3 fees 500/3000, official V3
quotation, six configurable USDC amounts, and six directed routes. This proposal preserves those
choices and ADR-0005's consistency/failure policy. It does not implement quotations, admit today's
venues, select an executor, or authorize M1-05. All defaults below are proposed engineering policy;
they are neither measured liquidity nor a promise of profitability or provider capacity.

## Proposed decision

### 1. Amounts, configuration, and deterministic routes

Use native bigint for base-unit amounts, reserves, fee arithmetic, prices represented as integer
ratios, gas units, wei, and signed surplus. USDC has six verified decimals and WETH eighteen;
identity comes from ADR-0005, never symbols. Number is permitted only for bounded metadata or
timing, not authoritative amounts. JSON preserves bigint as decimal strings with explicit units.

Propose this initial six-size grid, denominated in **USDC tokens**, not assumed USD value:

| USDC input | USDC base units |
| --- | --- |
| 10 | 10000000 |
| 50 | 50000000 |
| 100 | 100000000 |
| 500 | 500000000 |
| 1000 | 1000000000 |
| 5000 | 5000000000 |

Configuration supplies exactly six distinct, strictly increasing, positive decimal strings.
Allow at most six fractional digits; reject signs, exponents, separators, leading zeroes except
`0.xxx`, whitespace inside strings, and excess precision. Parse exactly, without float conversion
or rounding; normalize to base-unit strings. Reject zero, duplicate normalized amounts, invalid
ordering, or amounts above `2^255 - 1` before RPC. Keep the normalized grid and configuration
revision with the result. A changed grid requires fresh qualification; never shrink it silently.

Assign venue ordinals V2=0, V3-500=1, V3-3000=2. Enumerate ordered distinct pairs `(i,j)` in ordinal
order, each at all six sizes: **36 route/size entries**. A route starts in USDC, buys WETH in pool
i, then sells precisely that WETH output in pool j. The pools are distinct, so quoting each against
B does not require applying the first swap's state to the second pool. Each route/size is an
independent hypothetical transaction; evaluated routes never consume each other's liquidity.

### 2. V2 arithmetic and protocol comparison

Map `reserveIn` and `reserveOut` by the verified input/output addresses and `token0/token1`.
For positive exact input A and positive reserves, use the official library's integer expression:

```text
amountInWithFee = A × 997
amountOut = floor(amountInWithFee × reserveOut / (reserveIn × 1000 + amountInWithFee))
```

Use no intermediate division. The 0.3% fee is already included. Preserve the unsigned Solidity
arithmetic domain even though bigint can grow further: reserves must fit uint112; products and
sums must fit uint256. As an additional supported-model restriction require
`reserveIn + A <= 2^112 - 1`; do not present a reserve-overflowing hypothetical transfer as usable.
A computed zero output is a received numeric result but rejects that leg; a failed read is
unavailable, never numeric zero. Require output strictly below the output reserve.
[Official library](https://raw.githubusercontent.com/Uniswap/v2-periphery/master/contracts/libraries/UniswapV2Library.sol),
[pair reserve/balance limits](https://raw.githubusercontent.com/Uniswap/v2-core/master/contracts/UniswapV2Pair.sol).

Compare each distinct V2 leg input with the sourced mainnet Router02's `getAmountsOut` for the
two-token path at B. Require a two-element result, the same input, and exact output equality.
Mismatch makes protocol comparison rejected; failed comparison makes it unavailable. No epsilon
or approximate match. This checks a local calculation against deployed protocol logic, not a
second local copy of the same formula. Transfer behavior, approvals, inventory, and execution
remain later verification; quotation is not proof of a successful swap.
[Router implementation](https://raw.githubusercontent.com/Uniswap/v2-periphery/master/contracts/UniswapV2Router02.sol).

### 3. Sourced quotation contracts and V3 calls

These are documentation-sourced **candidates**, not newly verified deployments:

| Chain ID 1 role | Candidate | Source |
| --- | --- | --- |
| V2 Router02, comparison only | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` | [V2 deployments](https://developers.uniswap.org/docs/protocols/v2/deployments) |
| V3 QuoterV2 | `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` | [Ethereum V3 deployments](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments) |

During M1-05, require nonempty code at B, retain runtime-code hashes, and check Router02 `factory`
and `WETH` against ADR-0005. Check QuoterV2 `factory` and `WETH9` against the same sourced identities.
Repeat these checks per observation; missing code rejects, missing/failed reads remain unavailable.
Code/metadata checks are not an audit or independent proof of implementation behavior.
[Quoter immutable state](https://raw.githubusercontent.com/Uniswap/v3-periphery/main/contracts/base/PeripheryImmutableState.sol).

Use QuoterV2 `quoteExactInputSingle`, with tuple fields **tokenIn, tokenOut, amountIn, fee,
sqrtPriceLimitX96** in that order. Retain amountOut, sqrtPriceX96After, initializedTicksCrossed,
and gasEstimate, preserving their ABI ranges (uint256, uint160, uint32, uint256). Input must fit
positive int256 because the implementation converts it for the pool call. Do not confuse this
interface with Quoter V1. Its non-view function runs through read-only `eth_call`; it does not
submit a transaction, require a wallet, or become an on-chain staticcall.
[Interface](https://raw.githubusercontent.com/Uniswap/v3-periphery/main/contracts/interfaces/IQuoterV2.sol),
[QuoterV2 source](https://raw.githubusercontent.com/Uniswap/v3-periphery/main/contracts/lens/QuoterV2.sol).

Use the existing viem 2.57.20 ABI encode/call/decode boundary. Require B's blockHash and
requireCanonical true on actual requests/retries, disable batching/multicall and library retries,
and provide an explicit gas allowance of **5,000,000 gas units per contract call**. This allowance
bounds simulation work; it is not an executor gas estimate or transaction cost. Out-of-gas,
provider caps, reverts, unsupported calls, and malformed data cannot prove insufficient liquidity;
record quote unavailability with a sanitized reason. No fallback to another quoter/provider,
block number, synthetic quote, or default output.
[viem call parameters](https://viem.sh/docs/actions/public/call), [EIP-1898](https://eips.ethereum.org/EIPS/eip-1898).

### 4. Full-input evidence and the price limit

Pass the explicit protocol-boundary limit: `MIN_SQRT_RATIO + 1` for token0 → token1 and
`MAX_SQRT_RATIO - 1` for token1 → token0. Require it to lie strictly beyond the starting price
in the requested direction. Read the constants from the official TickMath specification during
implementation; retain the actual integer limit in quote evidence.
[TickMath](https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/libraries/TickMath.sol).

**A returned exact-input amount is not by itself full-input evidence.** QuoterV2's return does not
contain consumed input. The pool loop can end on input exhaustion or on reaching the price limit.
For the supported source-backed contracts, infer full consumption only when the returned price
is strictly inside that limit and moves consistently from the starting price:

- token0 → token1: `limit < sqrtAfter <= sqrtBefore`;
- token1 → token0: `sqrtBefore <= sqrtAfter < limit`.

Require positive output. A return at the limit is `rejected: full_input_not_proven`, even if it
might have consumed the exact input at that boundary. An out-of-range/opposite-direction return
is unavailable as inconsistent evidence. Do not count a partial output as the result of spending
the full input. This inference follows from the official pool stopping conditions; it is not a
new swap-engine implementation or independently tested behavior in M1-04.
[Pool swap source](https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/UniswapV3Pool.sol).

### 5. Finite-size admission and price-impact metric

Propose a maximum **100 bps (1%), inclusive, per leg**, relative to that pool's fee-adjusted
pre-trade marginal output at B. This is a research admission policy, not slippage tolerance,
an execution price guarantee, or a measured liquidity floor. Keep it fixed in policy revision
`quotation-v1`; revising it requires review and fresh qualification.

Define `n/d` as output base units per input base unit before fees:

| Pool/direction | n/d |
| --- | --- |
| V2 | reserveOut / reserveIn |
| V3 token0 → token1 | sqrtPriceX96² / 2^192 |
| V3 token1 → token0 | 2^192 / sqrtPriceX96² |

These are raw-unit ratios. Inverting the direction requires inverting the ratio; decimals are
applied only when explicitly converting token units. V3's representation follows
[TickMath's price definition](https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/libraries/TickMath.sol).
The following admission metric and threshold are this proposal's policy, not a copied UI metric.

For input A, fee f in millionths (V2=3000; V3=500 or 3000), and full-input output q, define:

```text
F = 1000000
X = A × n × (F - f)
D = d × F
shortfall = max(0, X - q × D)
impactBps = ceil(10000 × shortfall / X)
pass iff 10000 × shortfall <= 100 × X
```

Require A, n, d, X, and D positive and the expected verified fee. Use exact bigint cross-products;
never round the ideal output before comparison. The metric includes output/fee rounding effects
as adverse shortfall. Record the ratio, numerator/denominator, quoted output, and threshold so
the decision is reproducible. The fee adjustment removes the nominal fee from this impact
comparison; actual fee rounding remains in q. V3 fee arithmetic is specified by
[SwapMath](https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/libraries/SwapMath.sol).

Qualification belongs to **pool, direction, exact input, B hash, source/configuration/policy
revision, and analysis attempt**. For every route/size, qualify both legs at their actual inputs.
In particular, WETH input for leg two comes from leg one, not a separately chosen WETH size grid.
Zero output, supported-range failure, price-limit reach, or excessive measured impact rejects
that request. A failed/unreadable quote or protocol comparison remains unavailable.

**Require all 36 entries and both legs of every entry to pass before admitting the selected
three-pool workload.** Each venue therefore has evidence for every role/input it actually serves.
No profitable output is needed for liquidity qualification. If one entry fails, retain all outcomes
but keep workload admission false; do not substitute a tier, drop a size, or advertise a smaller
workload as the configured one. A blocked second leg has no fabricated input/output.

### 6. Coverage, gross surplus, and ranking

Maintain separate facts: all 36 terminal outcome entries accounted for; all required numeric
quotes/full-input evidence available; qualification; origin; canonicality; freshness; and cost
availability. Recording 36 entries including failures does not mean 36 successful calculations.

For complete route/size input A and final USDC output Z, `grossSurplus = Z - A` in signed USDC
base units. Fees and price impact are already in Z. Do not subtract them again, subtract slippage
tolerance, add a protocol-fee surcharge, or use independently sized legs.

The M1 default ranking is **largest absolute gross surplus in USDC base units** over the fully
admitted 36-entry grid. Break ties by smaller initial input, then route venue ordinals `(i,j)`.
Do not rank by floating-point ROI or switch ranking metrics when costs happen to appear.
Label the output `best tested gross result`; it is not a global optimum or net-profit result.
An all-negative/zero grid is an honest no-positive-gross-result outcome, while still retaining
its best tested result. Partial/rejected grids have diagnostics but no authoritative best result.

### 7. Transaction-cost and net-profit semantics

**M1-05's initial live transaction-cost and net-profit fields remain unavailable.** No reviewed
executor or full-transaction cost producer exists yet. Quoter gas, sums of per-leg gas, generic
gas constants, balances, or a user-entered number cannot establish complete executor cost.
Do not add a dummy executor or forge evidence to make those fields numeric. M2's executor/cost
design must separately establish and verify that producer; M1 can still rank gross results.

For a future reviewed cost producer, require a traceable bundle identifying the exact route/input,
chain/B, executor/runtime and calldata revisions, sender/funding/approval/wrapping profile,
complete transaction gas evidence, fee-price source/time, and any other execution charges or
explicitly justified zero charges. Gas for a full executor transaction must include its complete
transaction overhead and supported execution path; it cannot be inferred from quoter diagnostics.
Preserve whether the source is an estimate or fork receipt and the model's validity assumptions.

For a valid matching bundle, define `Cwei` as total estimated execution cost in wei. Full-transaction
gas multiplied by its documented effective wei-per-gas assumption is one component, with other
applicable charges accounted for explicitly. Do not add the base fee again to an already effective
gas price. EIP-1559's effective price includes base fee and the permitted priority component;
projections are assumptions about execution, not a receipt or inclusion guarantee.
[EIP-1559](https://eips.ethereum.org/EIPS/eip-1559), [Ethereum gas units](https://ethereum.org/developers/docs/gas/).

Propose the accounting valuation as the **maximum of the three verified pool marginal USDC/WETH
ratios at B**, compared exactly. Express its selected ratio n/d in **USDC base units per WETH wei**;
assume WETH's native-ETH unit correspondence only for this stated valuation model. Then:

```text
estimatedCostUsdcBase = ceil(Cwei × n / d)
estimatedNetSurplus = Z - A - estimatedCostUsdcBase
```

Round nonnegative cost upward once, after the exact conversion; preserve signed net results.
The maximum ratio is a conservative choice among these venues, not an independent oracle,
an ETH liquidation quote, or a guarantee against manipulation/depegging. Retain all three ratios,
the chosen pool, block, method, units, and valuation revision. No external price API is selected.

Require the whole cost/valuation bundle to match the route/size and valid state/model context;
missing, stale, incompatible, unknown-charge, or absent cost evidence leaves cost/net unavailable.
For a future live projection, require the same B and the existing live age/lag/canonicality gates;
cost and fee observations must also be at most 30,000 ms old with at most 2,000 ms future skew.
Require the producer's explicit model validity/revision to cover use time; no default lifetime
is inferred for gas calibration. A future producer design must establish that validity evidence.
Future fork receipts remain fork evidence; they cannot become live observations by relabeling.
Only a positive, available estimated net value may be labeled an estimated net-positive candidate,
subject to the full workload and temporal gates. M1-05 must not claim one from gross results.
Contract surplus still excludes caller gas; actual execution/capture remains a separate claim.

### 8. Bounded quote work and lifecycle

Consume a complete M1-03 observation with identity/structural checks passed and the origin intact.
Create a new analysis attempt linked to that observation; never overwrite M1-03's unavailable
suitability fields or mutate its historical validation events. Historical/fixture calculations
may be inspected under their explicit origin but never pass live eligibility.

Keep ADR-0005's 30,000 ms age, two-block lag, 5,000 ms validation age, 2,000 ms future tolerance,
5,000 ms request timeout, four in-flight requests, and one transient retry/250 ms minimum wait.
The **quote phase** has its own 20,000 ms monotonic deadline including verification, queued work,
retries, renewals, and final validation. It does not reset B's timestamp or freshness budget.
Add a cap of **100 logical RPC reads / at most 200 sends**, including control requests, and retain
actual counts. These are proposed bounds, not a latency or provider-capacity claim.

Before consuming/starting quote work, renew canonicality if expired. Pause new quote dispatch
while a required renewal runs; share one concurrency/send budget across quote and control work.
Reserve capacity for three final fresh chain/number-hash/head validation reads. If the cap or
deadline prevents required validation, the result is ineligible and remaining entries unavailable.
For live work, stop new dispatch when known age/clock gates fail; never restart at a new block
inside this analysis. Explicit historical inspection retains measured age/lag and enforces the
hash/canonical and operational rules, but does not require its historical block to be 30 s old
or younger. It remains historical and ineligible for live results.

Individual quote calls remain bound to B even if the head advances. Retry only the same logical
read at that hash under the existing transient policy; deterministic failures are terminal.
Late responses cannot modify sealed outcomes or a later attempt. Do not use state overrides,
deployless contracts, independent provider sessions, or weaker selectors to obtain a quote.

Within one analysis, exact-input reads may be reused only with identical observation/attempt,
origin, chain/hash, source/configuration/policy, contract/pool, tokens, fee, input, limit, gas
allowance, and other call parameters. Record the reference behind reused evidence. Never cache
fresh chain/header validation, share another attempt's result, or interpolate another trade size.

Finish with fresh chain, canonical number/hash, and head checks, then recompute eligibility before
publication/use. Confirmed invalidation is terminal and propagates to dependent qualification,
cycles, and rankings. Ambiguous failures mean unavailable validation; retain event history and
permit recovery only if all other gates still pass. A sealed numerical result can become stale
or invalidated afterward. There is no background loop/UI or permanent live result in this task.

### 9. Ownership and semantic evidence

Future `packages/domain` owns pure amount parsing, V2 arithmetic, rational metrics, composition,
admission, gross ranking, and conditional cost arithmetic. It receives explicit state/evidence,
never RPC, storage, or ambient time. `packages/protocols` owns ABI/deployment verification,
Router02 comparison, QuoterV2 I/O, and bounded reads. `apps/backend` owns attempts, clocks, control
validation, configuration, lifecycle, and sealing. Only M1-05 may introduce the domain package
when separately approved; this document creates no scaffold or executable interface.

Preserve analysis/observation/quote/qualification references; chain/hash and origins; revisions;
normalized grid; contract sources/code hashes; actual parameters/gas allowance; exact leg inputs,
outputs, ratios and limits; V3 post-state/tick-crossing/gas diagnostics; protocol comparison;
individual outcomes/reasons; reused-read references; wall/monotonic times; validation events;
request counts; admission/coverage/completeness; ranking metric; and cost/valuation availability.
No credential-bearing URLs, raw provider diagnostics, or secrets enter evidence. Serialization is
historical evidence, not restored live eligibility. Storage schema remains M1-09's decision.

## Alternatives considered

| Alternative | Tradeoff and proposed choice |
| --- | --- |
| Spot-price cycles or fixed WETH second-leg sizes | Easier but omit finite trade behavior or break composition. Use actual integer leg outputs. |
| Local V3 tick traversal | More control but duplicates a swap engine. Keep the required official quoter and inspect full-fill evidence. |
| Accept any successful quoter return | Can count a price-limit partial fill as full input. Require the strict post-price/full-fill gate. |
| Dollar TVL, token balances, or active liquidity as admission | Cannot establish depth for requested inputs. Use actual quotes and the explicit fee-adjusted impact metric. |
| Admit only a passing subset of sizes/pools | More availability but changes the configured comparison. Retain failures and require the full grid. |
| Rank ROI or assumed net profit | Different research question or unsupported costs. Rank absolute gross surplus with deterministic ties and label it precisely. |
| Add generic gas or sum quoter gas to estimate net now | Produces unsupported precision. Keep live net unavailable until complete transaction-cost evidence exists. |
| Always use one spot price for gas valuation | Simpler but ignores available venue variation. Select the maximum same-state marginal ratio, disclosing its limits. |
| Raise freshness limits to finish slow quotation | Hides stale results and changes ADR-0005. Keep limits and report ineligible/unavailable work. |

## Consequences and unresolved dependencies

The chosen policy would provide reproducible finite-size comparisons and honest empty/unavailable
results. Full-grid admission and strict time/price limits may often prevent a usable run; that is
an explicit outcome rather than permission to widen budgets or silently replace the workload.
Gross-positive output would remain preliminary research, not evidence of estimated net profit,
transaction success, available inventory, independent market truth, finality, or captured arbitrage.

The user must review these proposed defaults and accept/amend this ADR. M1-05 must then prove the
deployed comparison/quoter identities, actual pinned behavior, partial-fill gate, full-grid
qualification, and operational feasibility. Source branches are mutable; M1-05 should record the
exact reviewed source revision/package metadata with its integration evidence. No new package
version is selected or installed by M1-04; viem 2.57.20 remains the existing baseline.

M2 still needs executor/router/funding/approval and full transaction-cost generation design.
That dependency keeps initial live net results unavailable; it does not prevent implementing
gross quotation/admission under separately approved M1-05. M1-09 still owns persistent schemas.

## Acceptance and validation criteria

The [M1-05 validation plan](../tasks/M1-04-quotation-cycles-and-profitability-design.md#m1-05-validation-plan)
specifies offline and live gates. Acceptance of this ADR chooses the proposed arithmetic, grid,
quoter, full-fill/impact/workload admission, ranking, cost semantics, and operational budgets.
It does not establish that any test or new live quote passed, or authorize M1-05 implementation.

## Approval record

The user approved M1-04's design/research scope on 2026-11-17 with “i accept m1-04”.
This ADR is **Proposed** and has not been accepted. No M1-05 implementation approval is recorded.

## Implementation and evidence

Documentation/research only. Sources linked in this ADR were consulted on **2026-11-17**;
M1-04's task record owns actual research/documentation checks and access limitations.
No new live RPC, quotation, protocol execution, dependency, test suite, or fork evidence was
produced. Existing M1-03 evidence remains limited to its recorded identity/structural snapshots.
