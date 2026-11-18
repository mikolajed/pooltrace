# M1-04: Quotation, cycle evaluation, and profitability design

- State: Done
- Milestone: M1 — local read-only research application
- Related ADR: [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md)
- Accepted decision: [ADR-0006 — quotations, finite-size admission, and cycle profitability](../adr/0006-quotation-cycles-and-profitability.md)
- Requirement IDs: CR-01, CR-02, CR-03, CR-04, CR-05, CR-06, CR-09, CR-10 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed [M1-03](M1-03-registry-and-consistent-snapshots.md), accepted ADR-0005,
  and separate user approval of this design/research scope

## Outcome

A proposed ADR and an implementation-validation plan defining how verified, consistent pool
observations become finite-size quotations and comparable USDC-starting cycles. The design must
explain which results can be reported as gross returns, when estimated net profit is available,
and what evidence admits the selected pools for the intended trade sizes.

This is a documentation/research task. Completion means the proposal is ready for review;
design acceptance and M1-05 implementation approval remain separate.

## Scope

Research current official protocol, Ethereum, and viem sources and prepare the
next available proposed ADR. Record source links, retrieval dates, alternatives, assumptions,
unresolved dependencies, and the validation plan for the later implementation.

| Area | Required design |
| --- | --- |
| V2 quotations | Exact-input integer arithmetic, fee treatment, reserve/token mapping, rounding direction, supported ranges, and comparison against official protocol behavior. |
| V3 quotations | Official quoter deployment/interface selection and verification requirements, exact-input parameters, returned evidence, and hash/canonical reads under ADR-0005. No complete V3 swap engine. |
| Cycle composition | USDC → WETH → USDC across different selected pools; the first leg's exact output becomes the second leg's input. Define deterministic route identities and outcomes for all six directed routes. |
| Trade sizes and ranking | Six configurable USDC input amounts, exact base-unit parsing, validation, ordering, duplicate/invalid-size policy, and all 36 route/size outcomes. Define the ranking metric and ties; report the best tested size without claiming a global optimum. |
| Finite-size admission | Evidence, units, thresholds, and failure policy for liquidity and price impact at the intended sizes. Explain the reference used to measure price impact, partial fills/failures, and how pool qualification relates to individual route/size eligibility. |
| Gross and net results | Separate output, gross surplus, complete executor transaction costs, ETH-to-USDC valuation, and estimated net profit. Define cost provenance, age/rounding rules, and explicit unavailable results when required evidence is missing. |
| Consistency and lifecycle | Keep observation, quote, qualification, and route/size references traceable to one chain/block context. Define validation before use, bounded quote work, expiry, cancellation, rejected/incomplete results, and invalidation propagation without weakening ADR-0005. |
| Boundaries and handoff | Keep pure arithmetic separate from protocol I/O and backend orchestration. Specify semantic inputs/outputs and evidence needed by M1-05 and later storage/UI tasks without creating executable interfaces or schemas. |

Protocol fees and price impact are already reflected in correct quote outputs; do not subtract
them twice. Slippage tolerance is an execution constraint, not an additional profit deduction.
Quoter gas estimates do not replace complete executor transaction-cost evidence. Missing costs
must remain unavailable rather than become zero.

## Outside scope

- Application code, package scaffolding, executable contracts/interfaces, tests, or dependencies.
- Running new live RPC checks, market collection, quotations, benchmarks, forks, or transactions.
  Research specifies the integration evidence M1-05 must obtain; existing M1-03 evidence stays
  historical and does not prove current liquidity or finite-size suitability.
- A CLI/API/SSE/UI, database/schema/migrations, background service, executor, or deployment.
- Additional chains, providers, venues, tokens, or automatic replacement of a selected pool/tier.
- Acceptance of the resulting ADR, M1-05 implementation, commits, or pushes.

## Decisions and open questions

The Ethereum USDC/WETH workload, selected V2/V3 candidates, Node/Bun toolchain, hash/canonical
consistency, and structural-only M1-03 boundary are established requirements or accepted decisions.
Preserve them; surface a concrete incompatibility for review rather than silently changing scope.

ADR-0006, accepted on 2026-11-18, selects six inputs from 10 to 5000 USDC, a 100 bps fee-adjusted per-leg impact limit,
QuoterV2 with full-input evidence, all-36 workload admission, deterministic absolute gross-surplus
ranking, and explicit unavailable initial live net results. Its limits and cost/valuation semantics
are accepted design policy, not measured liquidity or successful quote evidence.

M1-03 leaves finite-size suitability unavailable and workload admission false. A proposed or
accepted design does not change those runtime outcomes; M1-05 must implement and verify the
accepted qualification rules before claiming the corresponding evidence under CR-02.

## Acceptance criteria

- [x] A proposed ADR is linked from this task and the ADR index, with each scope decision addressed.
- [x] Exact amounts/units/rounding, V2 comparison, official V3 quotation, route composition,
  six-size configuration, ranking, and all 36 route/size outcomes trace to the requirement IDs.
- [x] Finite-size admission and price-impact evidence have explicit units, thresholds, dependencies,
  and rejected/unavailable outcomes; structural checks alone never establish suitability.
- [x] Gross and net semantics preserve CR-06, including full transaction-cost evidence and its
  valuation, unavailable costs, and no duplicate fee/impact/slippage deductions.
- [x] Alternatives, current official sources, trust assumptions, and unresolved decisions are explicit.
- [x] An M1-05 validation plan distinguishes offline protocol/arithmetic checks, required read-only
  integration, and later fork/execution evidence without presenting planned checks as passed.
- [x] Validation covers both token directions, rounding/ranges, composed leg inputs, failed/partial
  quotations, qualification boundaries, all selected routes/sizes, stale/invalidated contexts,
  origin/provenance, and missing transaction-cost evidence.
- [x] Changes remain documentation-only; links, requirement references, task state, backlog, and
  current state are checked, with no invented deployments, market values, approvals, or results.

## Planned validation

Review the proposed ADR against the scope table and linked requirements. Check mathematical
definitions and official interface/deployment references, with explicit examples labeled as
constructed where appropriate. Inspect the M1-05 plan for observable pass/fail/unavailable
outcomes and actual wire-level consistency checks through the approved RPC boundary.

Check local links/anchors, whitespace, CR references, approval states, and changed-file scope.
No application tests or new live/fork checks are part of this design task.

## Approval record

- Documentation preparation: On 2026-11-17 the user requested “give me ref to this doc” after
  M1-04 was proposed. This authorizes preparing this task record for review.
- Design/research-task approval: Granted on 2026-11-17 when the user said “i accept m1-04”.
  This authorizes the documentation/research scope above, not application implementation or live RPC.
- Design acceptance: Granted on 2026-11-18 when the user said “i accept adr6”; recorded in ADR-0006.
- Implementation approval: Not granted; M1-05 and later tasks remain separately gated.

## Preparation history

The proposed task record was prepared for review before the design/research approval above.
Only this document and the backlog/current-state references were changed during preparation;
no application code, dependencies, tests, live RPC calls, commits, or pushes were introduced.
Preparation checks passed on 2026-11-17: local links/anchors, whitespace, and CR references across
30 Markdown files; `git diff --check`; the Proposed/unapproved task state; exactly three changed
documentation files; and unchanged Git HEAD `b54cc54`. These validate the review document, not
quotation behavior or integration. Approval would authorize only the documentation/research scope above.

## M1-05 validation plan

The bounded implementation scope is maintained in [M1-05](M1-05-quotation-and-cycle-analysis.md).

The following checks are **planned**, not executed application tests. ADR-0006 is accepted;
these checks require separately approved M1-05 implementation work. Preserve
M1-03's passing behavior and explicit unavailable suitability; append linked qualification/analysis
records rather than rewriting that evidence. Root checks must cover any actually introduced domain
package as well as protocol/backend code.

### Offline checks and controlled protocol responses

Exercise the actual ABI and bounded transport boundary for wire behavior. Use explicit constructed
fixtures, controlled wall/monotonic clocks, and exact integers for failures and temporal boundaries.
No fixture is a current market or execution result.

| Case | Required outcome/evidence |
| --- | --- |
| Q01 — six-size configuration | Exact base-unit parsing, normalized provenance, valid sub-token precision, and six positive ascending distinct inputs. Reject zero, duplicates after normalization, signs/exponents, bad precision/order/length, and signed-range overflow before RPC. |
| Q02 — V2 arithmetic | Both token directions, independently derived small exact vectors, division remainders, zero output, positive reserves, uint112/uint256 limits, and supported input headroom. Check monotonicity/output bounds and verify no intermediate rounding or double fee. |
| Q03 — deployed protocol comparison | Actual Router02 calldata/result mapping for every distinct V2 input, exact equality, two-element path output, matching input, and explicit mismatch versus unavailable comparison outcomes. Live evidence below supplies the independent deployed reference. |
| Q04 — quotation deployments | Hash-bound nonempty-code checks and code hashes; Router02 factory/WETH and QuoterV2 factory/WETH9 match sourced identities. Empty code, malformed/missing reads, wrong chain/factory/token, and a V1 ABI/address mix cannot pass. |
| Q05 — V3 ABI and exact input | Correct tuple field order and fee, both directions, positive int256 bounds, uint256/uint160/uint32 return ranges, non-view eth_call, gas allowance, and actual hash/canonical wire parameters. Malformed/empty returndata is unavailable. |
| Q06 — full-input evidence | Quote returns at the price limit, just inside it, outside it, and in the wrong direction; invalid starting limits, zero outputs, both supported direction inequalities, and boundary exact-fill ambiguity. Only positive consistent returns strictly inside the limit prove full input under this model. |
| Q07 — rational impact | V2 and both V3 ratios, correct inversion/decimal units, large products beyond Number precision, rounding/dust, and below/equal/above 100 bps using exact cross-products. Display ceiling must not change the decision. Fee is removed from the reference once and never charged twice. |
| Q08 — composition and coverage | Exactly six ordered distinct-pool routes and six sizes; leg two receives the precise output of leg one. Reject same-pool or different-context composition. A blocked leg two has an unavailable dependency, not a fabricated amount or independently sized quote. Preserve 36 terminal entries. |
| Q09 — workload admission | All 36 route/size entries and both actual legs must qualify. One rejected impact/full-fill result, unavailable comparison, missing venue, timeout, or blocked dependency prevents full workload admission without dropping/replacing entries. Negative gross returns alone do not reject liquidity. |
| Q10 — gross ranking | Signed surplus in USDC base units, deterministic smaller-input/route tie breaks, negative/zero/all-equal grids, positive-gross labeling, and no authoritative best for a partial grid. Record the gross ranking metric and never claim a global optimum/net profit. |
| Q11 — missing execution costs | Initial live cost/net values stay unavailable. Quoter gas, summed leg gas, generic/user gas numbers, unknown charges, or missing executor evidence cannot become zero-cost or estimated net-positive results. |
| Q12 — conditional cost arithmetic | Explicit fixture evidence checks full bundle identity/origin, route/input/hash/model matching, wei-per-gas versus gas units, no duplicate base fee, max same-state USDC/WETH ratio by cross-product, one upward rounding of converted cost, and signed net results. Stale/missing/incompatible evidence stays unavailable. This does not introduce a live cost producer. |
| Q13 — immutable context and reuse | Distinct attempt/observation references and unchanged source snapshots; reuse only within one attempt for identical full parameters. Do not reuse another origin/hash/grid/fee/input/limit/gas/source/policy revision or cached control validation. |
| Q14 — freshness and invalidation | The existing inclusive age/lag/validation/future limits, rollback, periodic renewal before new dispatch, fresh final chain/number-hash/head checks, confirmed terminal invalidation, ambiguous unavailable validation, retained recovery events, and propagation to qualification/ranking. |
| Q15 — operational budgets | Actual sends through viem, at most four simultaneous requests including control work, 5 s request timeout, 20 s quote deadline without resetting block age, one transient retry at the same hash/parameters, Retry-After, 100 logical reads/200 sends, and reserved final-validation capacity. Cap/deadline failures remain explicit. |
| Q16 — cancellation and failure meaning | Queued/active cancellation and ignored late returns cannot seal another attempt. Reverts, out-of-gas/provider limits, authorization errors, malformed data, and deterministic rejections have no blind retries; failed simulation is not proof of illiquidity. No new-block/provider/fixture fallback. |
| Q17 — representation and origin | Exact bigint JSON round-trip; units/revisions/parameters/limit/code/quote/qualification references retained; diagnostics separate from transaction costs; credential sanitization; fixture/historical origin never becomes live; stored evidence does not restore process-local eligibility. |
| Q18 — dependency boundaries | Pure domain calculations accept explicit state without RPC/storage/ambient clocks; protocol I/O and backend orchestration share the bounded reader. No UI, schema, wallet, transaction path, deployless workaround, or unrelated package scaffold is introduced. |

### Required read-only live gate

During separately approved M1-05, use the configured Alchemy endpoint and the accepted single-hash
workflow. Preserve exact versions, source revisions, candidate/code/metadata checks, chain/block,
attempts, normalized grid, parameters, outputs, impact/full-fill/protocol evidence, request counts,
timings, validation events, origin, and unavailable-cost reasons. Sanitize credentials throughout.

1. Verify the sourced Router02 and QuoterV2 candidates at B. Show actual eth_call/eth_getCode
   selectors under the existing bounded reader and handle unavailable capabilities honestly.
2. Record exact Router02 agreement for every distinct V2 leg input in the selected grid, in both
   directions. Require actual QuoterV2 outputs and full-input evidence for both V3 tiers/directions.
3. Produce all 36 route/size entries with actual composed second-leg inputs. The completion gate
   requires at least one **fully qualified/admitted** live grid under the accepted policy and
   fresh final validation; it need not contain a gross-positive or profitable opportunity.
4. Repeat at the same recorded block in explicit historical mode. Compare deterministic amounts,
   impact/full-fill decisions, post-prices/ticks-crossed, and ranking. Keep attempt/timing/validation
   differences separate; quoter gas is diagnostic and is not an amount or exact replay requirement.
5. Demonstrate elapsed expiry/revalidation and preserve an unavailable/rejected outcome with honest
   provenance. Controlled noncanonical/partial-fill responses belong to offline evidence unless
   actually observed live. Do not claim a controlled mainnet reorganization or executed swap.
6. Confirm full transaction costs and net profit remain unavailable in the initial live slice;
   this expected unavailable state does not fail quotation/admission completion. Positive gross
   return must not be presented as estimated net profit or execution/capture.

Missing access, unsupported/capped calls, failed full-input/admission/comparison, or inability to
finish fresh are failed/unavailable integration, not passed evidence. Preserve them and keep the
required completion gate incomplete until a usable run or explicit user scope/policy revision.
Never reduce the selected grid, raise the impact/age budget, or substitute a venue to manufacture
success. M2 separately owns executor/fork/receipt and future live cost-producer validation.

## Evidence and handoff

The research/proposal evidence below describes the 2026-11-17 handoff. Subsequent user acceptance
is recorded in the dated section at the end; no implementation evidence has been added.

Completed on 2026-11-17 under the explicit design/research approval above. The deliverables are
[proposed ADR-0006](../adr/0006-quotation-cycles-and-profitability.md) and the Q01–Q18/offline/live
M1-05 validation plan above. Every scope area has an explicit proposal, failure policy, and
validation requirement. The design remains subject to user acceptance.

### Research and review results

- Official V2 library, pair, Router02, and deployment references establish the sourced comparison
  candidate, integer fee/output expression, token mapping, reserve limits, and deployed comparison
  method. No new on-chain check of Router02 was performed.
- Official QuoterV2 interface/implementation, immutable-state, pool, TickMath, SwapMath, and Ethereum
  deployment sources establish the sourced quoter candidate, tuple/return meanings, signed input
  boundary, price/fee units, and pool stopping behavior. The proposed full-input inference is
  explicitly derived from that source and still requires M1-05 verification.
- Current viem call documentation and EIP-1898 describe hash/canonical and gas parameters. The
  existing installed viem baseline was inspected read-only; no dependency/API change or new compile/
  wire test was performed. M1-05 must verify the actual new call parameters through the bounded reader.
- EIP-1559 and Ethereum gas documentation distinguish gas, effective fee price, and total cost.
  The proposal selects exact conditional accounting/valuation semantics, while keeping initial
  live costs/net unavailable until the separately reviewed full-transaction producer exists.

All sources are linked at the corresponding ADR claims and were consulted on 2026-11-17.
An attempted generated Uniswap IQuoterV2 reference page was inaccessible through the web retrieval
tool; official GitHub interface/implementation sources were retrieved instead. This is a source
access limitation, not evidence of an unavailable deployed contract. Mutable branches and sourced
addresses are not runtime verification; M1-05 must record exact source revisions and actual checks.

### Actual validation

| Check | Result |
| --- | --- |
| Read scope/requirement/ADR review | Passed: CR-01 through CR-06 and CR-09/10 trace through the proposal and validation plan; ADR-0005's consistency/operational gates are retained |
| Python Fraction/integer scratch review | Passed: proposed size/base-unit conversions, six directed routes × six sizes, below/equal/above impact boundary with ceiling, ratio inversion, and upward cost rounding/signed surplus |
| Local Markdown/CR checker | Passed across 31 Markdown files: local links/anchors, whitespace, and defined CR references; Q01–Q18 IDs are unique and complete |
| `git diff --check` and changed-file inspection | Passed: cumulative changes are this task, ADR-0006, ADR index, backlog, and current state; all five files are Markdown |
| Existing artifacts/approval boundaries | Passed: toolchain manifests/configuration, lockfile, logo, and Git HEAD `b54cc54` unchanged; ADR-0006 remains Proposed; M1-05 is unapproved |

The scratch arithmetic review checks the design's units/boundaries; it is not application or
protocol testing. Behavioral tests were not rerun for these documentation-only changes. No new
market values, quotations, liquidity admission, integration success, execution, or net-profit
result is claimed. Existing M1-03 evidence retains its original limitations.

Only documentation changed. No code/scaffolding, packages, dependencies, tests, live RPC/fork calls,
commits, or pushes were introduced. Review ADR-0006 next; accepting it does not by itself approve
M1-05. Its concrete implementation scope remains a separate next task.

### ADR acceptance — 2026-11-18

The user said “i accept adr6”, accepting ADR-0006's design. Its status, the ADR index, backlog,
roadmap, and current state were updated; the technical policy and planned validation remain unchanged.
M1-05 implementation is still unapproved and has not started. Only documentation changed; no
code, dependencies, tests, live RPC/fork calls, commits, or pushes were introduced.
Acceptance-record checks passed: local links/anchors, whitespace, and CR references across
31 Markdown files; `git diff --check`; six documentation-only changes; unchanged ADR formulas,
technical values, source links, and Q01–Q18 matrix; Accepted status dated 2026-11-18 with
implementation still unapproved; and unchanged Git HEAD `70a4d1a`. No behavioral checks were
rerun for this acceptance update.
