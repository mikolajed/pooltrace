# M1-05: V2/V3 quotation and cycle analysis

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: accepted [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md)
  and [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md)
- Requirement IDs: CR-01 through CR-06, CR-09, CR-10 in [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed [M1-03](M1-03-registry-and-consistent-snapshots.md) and
  [M1-04](M1-04-quotation-cycles-and-profitability-design.md), explicit approval of this bounded
  implementation scope, and the configured Alchemy endpoint for the required read-only live gate

## Outcome

A working backend slice that consumes verified pool observations, obtains full-input V2/V3
quotations at their recorded block hash, qualifies the requested trade sizes, evaluates all
36 directed route/size combinations, and reports the best tested gross result when the complete
workload is admitted. Rejected, incomplete, unavailable, stale, and invalidated outcomes remain
traceable rather than becoming successful calculations or a silently reduced workload.

Live transaction costs and net profit remain explicitly unavailable. This task implements the
accepted conditional accounting semantics with explicit fixture evidence for validation; it does
not create a live cost producer or claim execution/capture from quotations.

## Scope

Implement the accepted decisions without changing their technical policy. ADR-0005 owns the
snapshot guarantees; ADR-0006 owns amount/range rules, grid, quote/full-input/impact checks,
admission, ranking, cost semantics, and quotation budgets. This task owns the bounded deliverables
and completion evidence; the linked ADRs remain the canonical specification.

| Deliverable | Bounded implementation |
| --- | --- |
| Working domain package | Introduce the actual private TypeScript `packages/domain` package required by this slice. Implement exact size parsing, V2 arithmetic, rational price/impact checks, cycle composition, admission, signed gross ranking, and conditional cost/valuation arithmetic without RPC, storage, or ambient time. |
| Protocol adapters | Extend `packages/protocols` with sourced Router02/QuoterV2 expectations, hash-bound code/metadata verification, exact V2 Router02 comparison, official single-pool V3 quotations, return/range checks, explicit gas allowance, and full-input evidence. Preserve the existing registry/snapshot behavior and pinned viem baseline. |
| Six-size workload | Validate the accepted default/configurable USDC grid exactly. Enumerate six ordered distinct-pool routes at six sizes, passing leg one's precise WETH output to leg two. Preserve every route/size outcome and dependency; do not fabricate an input for a blocked second leg. |
| Finite-size qualification | Produce immutable qualification records linked to the source observation and actual leg requests. Apply full-input, protocol-comparison, and 100 bps fee-adjusted per-leg impact gates. Admit the configured workload only when all 36 entries and both legs qualify. Keep gross profitability separate from liquidity admission. |
| Backend orchestration | Extend `apps/backend` with one-attempt analysis, shared quote/control concurrency and request budgets, required renewals, final fresh validation, cancellation, exact-parameter reuse within one attempt, and use-time eligibility. Keep completeness, coverage, qualification, origin, canonicality, freshness, and cost availability independent. |
| Result semantics | Preserve source observation content and append linked analysis/validation evidence. Rank the fully admitted grid by signed absolute USDC gross surplus with the accepted tie breaks; report an honest nonpositive result or unavailable best result where appropriate. Live cost/net values remain unavailable, never zero-filled from quoter gas or manual estimates. |
| Verification and guidance | Add meaningful Vitest checks for Q01–Q18, extend root checks to the actual domain/protocol/backend code, preserve Bun/frozen-lockfile reproducibility, and add an explicit read-only quotation integration harness. Document configuration, commands, exact source/dependency revisions, evidence, failures, and remaining limitations. |

The accepted defaults are six USDC inputs **10, 50, 100, 500, 1000, 5000**, a **100 bps inclusive
impact limit per leg**, and a **5,000,000 gas-unit allowance per contract call**. The quote phase
has a **20,000 ms** deadline, **100 logical reads / at most 200 sends**, and shared concurrency
of **four**, including validation/control work. Preserve ADR-0005's request timeout, retry,
age/lag, validation-age, and clock rules; quoting never resets the source block's age.

Retain the existing Node/Bun, TypeScript, Vitest, and viem baseline. Configure package exports,
workspace dependencies, and application checks for the code introduced. Recheck current official
interfaces/source revisions during approved implementation and record actual compatibility rather
than assuming documentation or M1-03's narrower integration proves the new calls. Dependency
changes must be necessary to this slice; unrelated toolchain upgrades are outside scope.

The live harness is an explicit verification entry point over shared backend behavior, not a
public market CLI or independently authoritative collector. Once this implementation task is
approved, its required gate may make read-only calls to the user's configured endpoint and write
sanitized local integration reports. Keep credentials in ignored backend environment files;
record nonsecret provenance labels and public chain evidence only.

## Implementation sequence

Within a separately approved M1-05 scope, proceed in reviewable increments:

1. Implement and verify the pure domain calculations and configuration boundaries.
2. Add and verify the sourced quotation-contract adapters through the actual bounded transport.
3. Integrate analysis, qualification, ranking, and lifecycle handling with existing observations.
4. Complete offline/root and clean-install checks, run the required read-only live gate, and record
   the actual result and limitations before handoff.

Routine choices within that approved scope do not need repeated approval. A material departure
from the accepted policy requires review; a slow or rejected live run does not authorize raising
limits, changing the grid, substituting a venue, or weakening consistency.

## Outside scope

- A public diagnostic CLI, API/SSE, UI, background scheduler, or startup/service lifecycle
  (M1-06/11/12). The explicit integration harness is the only new runnable entry point required here.
- SQLite drivers, schemas, migrations, or an application evidence store (M1-09/10). Local
  integration reports are review artifacts, not the persistent application database.
- A live transaction-cost producer, executor/router execution design, approvals/funding/wrapping
  transactions, fork execution, wallets, private keys, or transaction submission (M2).
- Full V3 tick traversal, new quoter/provider fallback, a gateway service, additional chains,
  tokens/venues/fee tiers, or automatic pool substitution.
- Deployless contracts, state overrides, weaker block selectors, benchmarks, deployment, or CI/CD.
- Unrelated package scaffolding, broad refactoring, or a general calculation/plugin framework.
- Commits and pushes. Only the user creates commits.

## Decisions and remaining dependencies

The user accepted ADR-0006 on 2026-11-18 with “i accept adr6”. That settles the design and does
not by itself approve this implementation scope. Do not ask for the same design acceptance again.

M1-03's live report verifies only its recorded identity/structural snapshot. Router02/QuoterV2
deployments, new ABI/wire behavior, full-input inference, finite-size admission, and quotation
latency remain unverified until this task produces actual evidence. The new qualification record
must not rewrite the source observation's explicitly unavailable suitability or imply it was
qualified at collection time.

The complete live grid is a required completion gate under the existing
[M1-05 validation plan](M1-04-quotation-cycles-and-profitability-design.md#m1-05-validation-plan).
Missing RPC access or an unsupported/failed/too-slow run may leave useful offline progress, but
cannot satisfy that gate. Keep the task incomplete unless a usable run is recorded or the user
explicitly revises the scope/policy. No profitable opportunity is required to complete the task.

Net-profit unavailability is an expected boundary of the initial live slice, not a failed quote
gate. Conditional cost arithmetic uses explicit fixture evidence to check units, provenance,
rounding, and unavailable states; it does not authorize importing invented gas/cost values as
live evidence. M2 still owns the reviewed full-transaction cost producer and execution validation.

## Acceptance criteria

- [x] ADR-0005 and ADR-0006 are accepted.
- [x] The user explicitly approves this bounded M1-05 implementation scope.
- [x] The actual domain/protocol/backend packages install reproducibly with Bun's frozen lockfile;
  root verification covers all introduced source/tests and preserves the existing M1-03 checks.
- [x] Exact size parsing, V2 range/rounding/fee arithmetic, rational metrics, composed leg inputs,
  signed surplus, and deterministic ranking satisfy the accepted rules without float amounts.
- [x] Sourced Router02/QuoterV2 identities and runtime-code provenance are verified at B; V2 outputs
  exactly match the deployed comparison, and actual V3 calls retain full-input and returned evidence.
- [x] Every contract/code read and retry is bound to B with the canonical selector and accepted
  call parameters. Actual send/concurrency/deadline/cancellation/renewal behavior respects all budgets.
- [x] All 36 route/size outcomes and both-leg qualification dependencies are retained. One failed
  qualification prevents full workload admission and authoritative best-result ranking.
- [x] Complete admitted grids have the correct best tested gross result, including negative/zero
  cases. Live transaction costs/net profit remain unavailable and are never inferred from quoter gas.
- [x] Meaningful Q01–Q18 checks cover the actual arithmetic, transport, lifecycle, origin, credentials,
  conditional cost evidence, and boundaries in the canonical validation plan.
- [x] The required read-only live gate records at least one fully qualified/admitted 36-entry grid
  with fresh final validation, exact V2 comparison and V3 full-input evidence, historical same-block
  replay, and honest elapsed-expiry/unavailable-state evidence. Fixtures cannot satisfy this gate.
- [x] Exact quantities, units, parameters, source/configuration/policy/dependency revisions, timings,
  read/qualification/validation references, and failures survive the documented handoff encoding.
- [x] Configuration/setup, actual commands/results, remaining limits, backlog, and current state
  are updated. No next task, public interface, persistence, transaction path, commit, or push starts.

## Planned validation

Use the canonical [Q01–Q18 and required live gate](M1-04-quotation-cycles-and-profitability-design.md#m1-05-validation-plan)
instead of copying its matrix into a competing specification. Add offline tests to the actual
packages and exercise the ABI/reader boundary for selectors, gas parameters, retries, request
counts, cancellation, and control validation. Check pure arithmetic with exact vectors and useful
properties; deployed Router02 comparison supplies independent protocol behavior evidence.

Run `bun run check`, frozen-lockfile installation, and the documented checks from a clean source
copy without secrets or pre-existing dependencies. Preserve existing code/toolchain behavior;
report failed, skipped, and unavailable checks honestly. Review dependency boundaries and changed
file scope, Markdown/requirement links, exact evidence encoding, and credential sanitization.

Run the new explicit read-only quotation gate only after implementation approval. Record actual
chain/block, source/contract verification, all 36 outcomes, admission, timing/budget, fresh validation,
same-block historical comparison, and expiry/revalidation evidence. Keep quoter gas diagnostic;
net cost/profit remains unavailable. Controlled partial-fill/reorganization/cancellation cases are
offline evidence unless actually observed live; no swap, fork execution, or capture claim is made.

## Approval record

- Documentation preparation: On 2026-11-18 the user said “do it then” in response to preparing
  the M1-05 implementation scope for review. This authorizes this task document and navigation/
  current-state updates; it does not approve application implementation.
- Design acceptance: Granted for ADR-0005 on 2026-11-17 and ADR-0006 on 2026-11-18; their approval
  records maintain the actual design decisions.
- Implementation approval: Granted on 2026-11-18 for M1-05 only.
- Approved implementation scope and user instruction: “i accept m1-05”. This authorizes the
  bounded implementation, necessary workspace/dependency changes, offline checks, and configured
  read-only live gate above. It does not authorize subsequent tasks, commits, or pushes.

## Preparation history

The following notes describe preparation before implementation approval.

Prepared for scope review on 2026-11-18. Implementation has not started. Earlier ADR-0006 acceptance
updates are preserved. No application code/scaffolding, dependency installation, tests, new live
RPC/fork calls, commits, or pushes were performed during this preparation.

Preparation checks passed on 2026-11-18: local links/anchors, whitespace, and defined CR references
across 32 Markdown files; `git diff --check`; unchanged ADR formulas/technical values and the
canonical Q01–Q18 matrix; M1-05's Proposed/unapproved state and ADR-0006's Accepted state; and
unchanged Git HEAD `70a4d1a`. Cumulative pending changes, including the earlier ADR acceptance
update, are exactly seven Markdown files; application and dependency files are unchanged.

These checks validate the scope document, not quotation behavior or integration. No application
tests were run for this documentation-only preparation. This Proposed task and the accepted ADRs
do not manufacture implementation approval.

## Evidence and handoff

Completed on 2026-11-18 under the explicit implementation approval above. Work stopped at M1-05;
no M1-06 or subsequent task was started. Changes remain uncommitted, with Git HEAD `0ec2e80`.
No commit or push was made.

### Implemented artifacts and behavior

- [`packages/domain`](../../packages/domain/src/index.ts) supplies exact six-size parsing, V2
  supported-range arithmetic, direction-aware rational prices, impact/full-input predicates,
  deterministic route/ranking helpers, and conditional cost/valuation arithmetic. It has no
  runtime dependencies, RPC, persistence, or ambient clock access.
- [`quotes.ts`](../../packages/protocols/src/quotes.ts) verifies sourced Router02/QuoterV2 code and
  factory/wrapped-token metadata at B, records runtime-code hashes, compares V2 outputs exactly,
  and reads V3 quotations with explicit gas/hash/canonical parameters and full-input checks.
- [`analysis.ts`](../../apps/backend/src/analysis.ts) composes all 36 entries from actual leg
  outputs, retains failures/dependencies, shares quote/control work under the bounded reader,
  and seals immutable records referencing the source observation. Within-attempt read reuse is
  keyed to the complete fixed context and varying parameters; original snapshots are unchanged.
- The reader supports quote-only logical/send caps and reserved final control reads, with a gate
  on actual state sends including retries. Three state workers leave a semaphore slot for fresh
  renewal, keeping quote/control traffic within four concurrent requests. Logical counts include
  attempted reads; send evidence counts only actual wire sends. M1-03 retains its existing defaults.
- `analysisEligibility` recomputes temporal/canonical gates, coverage, numeric completeness,
  qualification, current live admission, and best result separately. Historical/fixture results
  remain explicit; confirmed invalidation is terminal. Expired validation can be renewed through
  `prepareAnalysisForUse`, preserving the prior record and event history.
- Conditional cost arithmetic validates supplied evidence/state and upward-rounded maximum-price
  valuation. It creates no cost evidence. The analysis API has no live cost override and returns
  explicit unavailable cost/net objects. Quoter gas stays diagnostic.
- [`check-quotes-live.ts`](../../scripts/check-quotes-live.ts), the
  [README](../../README.md#development-setup), `.env.example`, and
  [engineering notes](../ENGINEERING.md#quotation-integration) document the explicit harness,
  optional exact grid configuration, private credentials, and use-time/historical boundaries.

### Actual commands and checks

| Check | Result |
| --- | --- |
| `bun install` | Passed after approved cache/temp access; new domain/workspace links only, no external version upgrades |
| `bun run check` in the workspace | Passed runtime pins, root/domain/protocol/backend TypeScript, Biome lint/format, and **95 tests across four files** |
| `bun install --frozen-lockfile` in a clean source copy without secrets, `.git`, `node_modules`, or live data | Passed; 110 packages installed and the lockfile remained unchanged |
| `bun run check` in that clean installation | Passed with the same 95 tests and no RPC configuration |
| `bun run check:quotes:live` | Passed the fully qualified live grid, exact protocol comparison/full-input evidence, live expiry/use check, and same-block historical output/qualification/ranking replay |
| Final handoff checks | Passed links/anchors, whitespace, and CR references across 32 Markdown files; `git diff --check`; credential scan of 33 changed/new files; exact source/lockfile equality with the tested clean copy; unchanged logo/HEAD; and exact preservation of the archived live evidence |

Initial test/type/lint issues were corrected before the passing checks: an empty parameterized
case, async fixture response typing, an unused import, explicit ratio typing, and lint suggestions.
The initial sandboxed quotation gate failed honestly with `network` and produced an unusable
report rather than switching to fixtures. The authorized network-enabled gate succeeded.
A first usable run at block 26441897 also passed; the final archived run below includes explicit
ranking comparison. The final harness checks live expiry/use before independent historical replay,
so each eligibility assertion retains its own actual validation time instead of claiming that
an archived earlier check is current.

The existing M1-03 tests are included in the 95-test total. New domain/analysis/transport checks
exercise the canonical Q01–Q18 plan through exact arithmetic and actual viem encoding/transport:

| Coverage | Evidence |
| --- | --- |
| Q01/Q02/Q07/Q10 | Exact decimals and rejected grids; independently derived V2 fraction vectors, flooring/monotonic bounds/headroom; both V3 raw-unit ratios; exact inclusive 100 bps boundaries; signed ranking and deterministic ties |
| Q03–Q06/Q08/Q09 | Router02 equality/mismatch and QuoterV2 wire calls; contract identity rejection; full-fill limit/opposite-price/impact/zero-output failures; exact second-leg inputs, within-attempt reuse, all 36 outcomes, and blocked dependencies |
| Q11/Q12 | Explicit unavailable costs, exact maximum-ratio valuation, upward cost rounding/signed net, mismatched/missing/stale evidence, malformed quantities, origin separation, and required current live-state evidence for conditional projections |
| Q13–Q18 | Separate immutable attempts, source/configuration matching, fresh renewal and shared control concurrency, quote deadline/read/send caps with reserved final reads, terminal invalidation/unavailable recovery, cancellation, origin, representation, and credential sanitization |

Offline responses are constructed data. Live deployed Router02/QuoterV2 calls provide the independent
protocol integration evidence; fixtures alone are not treated as deployed execution proof.

### Source and dependency provenance

Official deployment/interface/implementation/TickMath/viem documentation was rechecked on
2026-11-18. GitHub's revision API was inaccessible through the web tool and sandbox DNS failed;
an authorized read-only retrieval resolved these exact public repository revisions. Corresponding
pinned raw implementation sources were opened and reviewed:

| Reviewed source | Revision |
| --- | --- |
| Uniswap V2 periphery | `ed24991304291297c3b4a52818d02f46a17aa9a2` |
| Uniswap V3 periphery | `24ccf014fe7f81d74a14c1689d6fdf123f280e45` |
| Uniswap V3 core | `5ea68a77cb541c6b3812df783be71ba8c081e25f` |

`QUOTE_SOURCE` retains these revisions and pinned source URLs in each contract-verification record.
This identifies reviewed source, not an independent reproduction/audit of deployed bytecode.
viem remains 2.57.20, Vitest 5.1.0, Node 26.3.1, and Bun 1.3.11. The frozen lockfile SHA-256 is
`915b2f3f4baa2461b0e87e4796eaa1d27771c12b4189ddb211e0e38e939c1870`.

### Recorded read-only live result

The [complete sanitized report](../evidence/M1-05-live-2026-11-18.json) preserves source observation,
analysis, as-of eligibility, historical replay/eligibility, and renewed validation. It is historical
evidence and does not assert that the block is fresh now.

- Chain ID **1**, block **26441925**, timestamp **1795004675** seconds.
- Hash `0x958f1e6b9d785e337a07c92e7422e15a67715b15d4a87e40184c06e33240608d`;
  parent `0x13eb1a4cba1e022550e3a518d2cd6214b828e8307a6ba5200616c6c4894a669a`.
- Observation `302d4cfa-03de-4bac-9ee0-a70e23303a4f`; analysis
  `02e9f487-171d-4e7c-b122-c0f435c8ec0d`; live origin and `quotation-v1` policy.
- Snapshot collection took **3892.802792 ms** and 41 sends. Analysis ran
  **12:24:43.243–12:24:46.335 UTC** on 2026-11-18, taking **3092.093291 ms**.
- All **six** quotation-contract checks passed, with both observed runtime-code hashes recorded.
  There were **54 distinct leg quotes**, **63 logical analysis reads / 63 sends**, and no transient
  retries, rejected entries, or attempt failures. The three-worker/four-request budget was preserved.
- All **36 entries** qualified, including exact V2 protocol comparison and V3 full-input evidence.
  Maximum measured per-leg impact was **6 bps**, below the accepted inclusive 100 bps budget.
- At initial use, canonicality was valid, block age **11336 ms**, head lag **0**, and validation
  unexpired. The workload was admitted for that recorded state; coverage and numeric quotes were complete.
- After real elapsed validation expiry, renewal retained three total validation events and was
  valid/fresh at **16564 ms** block age, lag **1**, and unexpired validation. The report retains
  the expired-before-use flag and the renewed as-of eligibility.
- The explicit historical replay matched actual outputs, qualification/full-input/impact evidence,
  and ranking at the same block. Origins, attempts, observation/validation times, and diagnostic gas
  remain separate; no historical result was relabeled live.

The best tested gross result was route **V3-3000 → V3-500**, input **10 USDC**, gross surplus
**−0.014094 USDC** (−14094 base units), final output **9.985906 USDC**. All tested gross results
were negative; no profitable opportunity was required or reported. Transaction costs and net profit
remained explicitly **unavailable** in both initial and renewed eligibility.

### Limitations and next proposed action

Qualification is specific to the recorded block, grid, leg inputs, and policy. Neither this run
nor positive structural checks grant permanent venue admission. The provider and supported external
contracts remain trust assumptions; source/code/metadata evidence is not an audit or consensus proof.
Controlled failure/reorganization/partial-fill cases were tested offline, not claimed as observed
mainnet reorganizations or executed swaps. No transaction, fork, inventory/approval validation,
full-transaction cost producer, net-profit evidence, finality, or capture is established.

Review this bounded implementation/evidence next. M1-06's CLI/configuration scope may be prepared
for separate approval afterward; persistence/UI/service tasks remain separately gated. No next
task, commit, or push was started.
