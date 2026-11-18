# M1-07: Validate arithmetic, token ordering, rounding, composition, and snapshot failures

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md)
- Requirement IDs: CR-01 through CR-05 and CR-10; preserve CR-06, CR-09, and CR-11 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed M1-03/M1-05/M1-06, the accepted ADRs above, and explicit approval of
  this bounded validation/implementation scope

## Outcome

A reviewer can trace M1's exact arithmetic, address-based token direction, cycle composition,
and snapshot failure handling to meaningful regression checks and independent expectations.
The work targets gaps in the existing suite; it does not build another quotation engine or
repeat tests solely to increase a count.

Any demonstrated defect is either corrected within the accepted design and covered by a failing
then passing regression, or recorded as unresolved. A changed financial policy or architecture
returns for review. Passing tests are evidence, not formal verification or execution proof.

## Existing evidence and targeted gaps

Read-only inspection was performed at commit `b0ee436`. The **116-test baseline** is the recorded
M1-06 result, not a new test run during this preparation. These are gaps in explicit coverage
identified by inspection, not confirmed failing behavior.

| Existing evidence | What it already demonstrates | What M1-07 should strengthen |
| --- | --- | --- |
| [Domain tests](../../packages/domain/test/domain.test.ts) | Exact sizes, small V2 vectors/flooring and monotonic bounds, range/headroom rejection, reciprocal V3 ratios, inclusive impact threshold, full-input limits, signed ranking, and conditional cost arithmetic | Independent larger/asymmetric vectors, accepted range edges and adjacent failures, nonintegral ratio/fee cases, and ranking that is independent of row order |
| [Analysis tests](../../apps/backend/test/analysis.test.ts) | All 36 entries, actual leg-2 input linkage, hash/gas selectors, preserved source evidence, fixture failures, renewal, invalidation, deadlines, and origin separation | Distinct route/input keys, explicit mixed-unit cycle expectations, one targeted failed dependency among otherwise usable quotes, and failures introduced during running analysis |
| [Snapshot tests](../../apps/backend/test/snapshot.test.ts) | Identity/structural screening, missing/malformed state, unsupported selectors, wrong chain, canonicality, freshness boundaries, rollback, and terminal invalidation | Address-direction checks with asymmetric state, additional identity fields, and preservation of these gates at the analysis boundary |
| [RPC tests](../../packages/protocols/test/rpc.test.ts) | Wire selectors, bounded retries/concurrency/read/send budgets, reserved final reads, timeouts, cancellation, and late responses | Selected quote-stage combinations of retry, queued work, expiry, and final validation, rather than duplicating transport-only assertions |
| [CLI tests](../../apps/backend/test/cli.test.ts) and [M1-06 evidence](M1-06-cli-and-configuration.md#evidence-and-handoff) | Exact output/configuration, honest statuses, real process SIGINT, and live text/JSON handling | Preserve these regressions while strengthening the shared backend; no new command interface is proposed |
| [M1-05 evidence](M1-05-quotation-and-cycle-analysis.md#evidence-and-handoff) | Independent deployed Router02 comparison, real QuoterV2 calls, qualified live grid, same-block replay, and elapsed expiry/renewal | Reuse as historical evidence when production behavior is unchanged; obtain new integration evidence if a correction changes that behavior |

The general constructed transport now calls the production V2 calculator for its reply. A test
that compares only those two results cannot independently establish arithmetic correctness.
M1-07's arithmetic expectations must come from reviewed literal vectors, exact mathematical
properties, or the deployed protocol comparison. Constructed V3 replies remain diagnostics, not
independent swap simulation or live liquidity evidence.

## Scope

- Add focused checks in the existing domain/protocol/backend test boundaries. Test helpers and
  explicit constructed responses may be added where needed; production code must not import tests.
- Use source-backed literal inputs/outputs and independent integer/rational assertions. Include
  values beyond safe Number precision, asymmetric reserves/prices, and both token directions.
- Use bounded deterministic enumeration or a recorded fixed seed for generated cases, with
  reproducible failing inputs. The existing Vitest toolchain is sufficient; add no dependencies.
- Exercise actual ABI encoding/decoding and the shared reader for protocol-boundary failures.
  Use controlled clocks and pending responses for lifecycle transitions, without network or
  timing-dependent sleeps in the offline suite.
- Permit a minimal production correction only when a reproducible case demonstrates violation
  of an accepted requirement/ADR. Record before/after evidence and the affected behavior. Preserve
  exact units, selectors, origin, venue/grid policy, budgets, costs, and error distinctions.
- Maintain one result matrix in this task with links to actual cases, commands/results, fixes,
  and unresolved limits. Existing checks may satisfy a row when their assertions demonstrably
  cover it; explain that reuse instead of creating duplicate tests.

## Accepted validation cases

R01–R08 are scoped to M1-07. They extend the existing
[V01–V18 plan](M1-02-registry-and-consistent-snapshots.md#m1-03-validation-plan) and
[Q01–Q18 plan](M1-04-quotation-cycles-and-profitability-design.md#m1-05-validation-plan);
they do not replace those plans or change the accepted rules.

| Case | Required behavior and independent check |
| --- | --- |
| R01 — amount/range edges | Exact micro-USDC and maximum accepted input parsing, adjacent oversized/invalid values, normalized duplicates, and rejected notation. Invalid grids fail before I/O. V2 zero/negative/out-of-range reserves/input and the exact supported headroom boundary remain distinct from valid arithmetic. Derive expected base units without the parser under test. |
| R02 — V2 rounding/properties | Reviewed literal vectors with unequal reserves, large raw amounts, and both directions. For each tested accepted input, verify the returned integer brackets the exact fraction (`q × D <= N < (q + 1) × D`), stays below reserveOut, and is nondecreasing with input. Include remainder/zero-output cases and the supported range edges. Do not compare the calculator only against a fixture that invokes it. |
| R03 — address direction and units | Decode actual V2 path and V3 tuple requests for USDC → WETH and WETH → USDC, both selected V3 fees, unequal reserve values, and a nonunit sqrt price. Verify reserve/ratio direction, exact raw input/output, and explicit 6/18-decimal interpretation. Add uncovered token1/wrapped-token identity mismatch cases; reject mismatches without substituting a pool or swapping token metadata to manufacture a valid registry. |
| R04 — V3 predicates and impact | Exact reciprocal raw-unit ratios at nontrivial prices and supported sqrt bounds; both fees and directions; impact exactly at and immediately around the inclusive threshold using a fractional ideal output. Full-input checks cover unchanged/inside/at/beyond limit and opposite movement. Expectations follow ADR-0006 and pinned constants, without implementing V3's swap engine. |
| R05 — composition and ranking | Exactly six distinct directed routes × six distinct configured inputs, with 36 unique route/input keys. Each second leg consumes the exact first-leg WETH output; final output/gross use USDC units with fees/impact included once. Include independently specified representative cycle amounts and all-negative, zero, and mixed-sign results. Shuffling row order must preserve the winner and size/route tie breaks; partial/rejected grids have no authoritative best result. |
| R06 — isolated quote failures | Introduce one selected first- or second-leg failure among otherwise valid constructed responses. Cover a one-unit Router02 mismatch, wrong echoed input/array shape, malformed or truncated ABI output, numeric zero, revert, and missing response. Retain all 36 terminal rows and dependency reasons, distinguish rejected from unavailable and diagnostic values from eligible results, and never admit/rank a failed grid. |
| R07 — canonicality during analysis | Introduce confirmed noncanonical/replaced-block evidence while quotes are pending, and final validation unavailability after numeric quotes succeed. Retain B/hash and the source observation, block current admission/best result, and preserve invalidation as terminal despite later good responses. Unavailable validation may recover through explicit shared renewal; it cannot silently count as valid. Keep fault injection clearly constructed. |
| R08 — bounded work during failure | Cancel with quote work active/queued; trigger expiry/deadline during a quote retry or renewal; retain all terminal outcomes and never invent numeric output for a missing reply. Assert actual sends remain pinned, use existing gas/read/send/concurrency caps and final-control reservation, and ignore late replies without restoring eligibility. Reuse transport-only coverage, adding only missing analysis-stage combinations. |

An assertion should detect a concrete wrong behavior such as reversed reserves, rounded input,
double fee deduction, independently sized second leg, absolute-value ranking, or successful
admission after invalidation. It must not simply repeat the implementation's calculation.

## Sources and decisions

ADR-0005/0006 remain the behavioral authority. No new ADR is proposed for additional checks or
small corrections that restore their rules. A changed rule, public contract, provider strategy,
or architecture requires its own reviewed decision and authorization.

Pinned official sources already retained by `QUOTE_SOURCE` were reread on 2026-11-18:

- [V2 library](https://raw.githubusercontent.com/Uniswap/v2-periphery/ed24991304291297c3b4a52818d02f46a17aa9a2/contracts/libraries/UniswapV2Library.sol)
  for token/reserve direction and integer output calculation.
- [TickMath](https://raw.githubusercontent.com/Uniswap/v3-core/5ea68a77cb541c6b3812df783be71ba8c081e25f/contracts/libraries/TickMath.sol)
  for sqrt-ratio representation and bounds.
- [IQuoterV2](https://raw.githubusercontent.com/Uniswap/v3-periphery/24ccf014fe7f81d74a14c1689d6fdf123f280e45/contracts/interfaces/IQuoterV2.sol)
  for tuple fields and returned evidence.

These source references do not independently reproduce deployed bytecode, prove full swap
execution, or authorize new calls. Keep vector derivation/provenance next to the actual checks.

## Outside scope

- New tokens/venues/chains, provider fallback/gateway, changed fee/size/impact/ranking/freshness
  policy, a separate V3 swap engine, or a weakened qualification gate.
- New CLI features, HTTP API/SSE, UI, storage, application services, benchmarks, toolchain or
  dependency upgrades, CI/CD, and deployment.
- Full-transaction cost generation, available live net-profit claims, executor/wallet/transaction
  submission, Anvil/fork work, or execution/capture evidence.
- A new formal verification, mutation-testing, or property-testing platform, arbitrary forged
  archive ingestion, and unrelated refactors. Generated offline cases remain ordinary test inputs.
- M1-08 or later work, further commits, and pushes beyond the separately requested scope-document
  and completed test/documentation commits. No push is authorized.

## Acceptance criteria

- [x] The user explicitly approves this bounded M1-07 scope.
- [x] R01–R08 have actual linked evidence; reused cases and newly closed gaps are distinguishable.
- [x] Arithmetic expectations are independent of the calculation under test; asymmetric/large
  values, precision/range boundaries, address direction, and rounding are meaningfully verified.
- [x] Composition and ranking preserve exact units, both-leg dependencies, unique complete grid
  coverage, deterministic signed ranking, and no authoritative best result for unusable grids.
- [x] Isolated failures and running-analysis lifecycle transitions preserve all terminal outcomes,
  pinned state, cancellation/budgets, unavailable/rejected distinctions, and terminal invalidation.
- [x] Any production correction has a demonstrated regression and restores the accepted contract;
  no unresolved required failure is hidden or weakened into a passing test.
- [x] Root checks and clean frozen-lockfile setup pass on the pinned baseline without credentials.
  Added checks run offline, deterministically, and through the actual package boundaries.
- [x] If production quotation/registry/snapshot/lifecycle behavior changes, the affected explicit
  read-only integration gates pass with new real chain/block/as-of and replay/renewal evidence.
  Otherwise prior integration evidence is linked as historical, without claiming a new live run.
- [x] Actual passed/failed/skipped/unverified checks, limits, fixes, source provenance, backlog,
  and current state are recorded. No later task, commit, or push starts automatically.

## Planned execution and validation

After explicit approval, map each R case to existing assertions and add only missing coverage.
Establish a failing case before a production correction. Run targeted cases while iterating, then
`bun run check` and a clean `bun install --frozen-lockfile && bun run check` without private config.
Record deterministic case bounds/seeds and any discovered counterexamples. Preserve lockfile,
runtime pins, brand assets, credentials, and public CLI behavior.

For a production change affecting collection/identity/freshness, run `bun run check:live`; for
quotation/composition/admission changes, run `bun run check:quotes:live` and verify actual CLI
handling as affected. Use the existing configured read-only endpoint and sanitization. The quote
gate still requires an admitted 36-entry live grid, same-block replay, and elapsed expiry/renewal;
no positive opportunity is required. Missing RPC/unsupported/failed gates remain unverified and
keep the affected completion criterion open unless the user explicitly revises scope. Do not
repeat live calls when only offline checks/docs change or reuse fixtures as live evidence.

Finish with scope/credential checks, local links/anchors/requirement references, `git diff --check`,
and an evidence handoff. M1-08 documentation consolidation remains a separately approved task.

## Approval record

- Documentation preparation: On 2026-11-18 the user said “lets move on” after the M1-06 commit
  and the proposal to prepare M1-07's validation scope. This authorizes read-only inspection and
  this scope/navigation/current-state documentation, not unspecified implementation.
- Related design acceptance: ADR-0001/0005/0006 are accepted; their records own those decisions.
- Implementation approval: Granted on 2026-11-18 for M1-07 only.
- Approved implementation scope and user instruction: “i accept i think you should commit first
  and then move one with work”. This accepts the reviewed bounded scope, including focused
  tests, necessary minimal corrections under the existing ADRs, and the stated validation gates.
- Separate commit authorization: The same instruction explicitly requested the reviewed scope
  commit before implementation. Commit `7a9b68b` contains the three prepared documentation files.
  Further commits/pushes and later tasks are not authorized by this bounded instruction.
- Completion commit authorization: After the completed M1-07 handoff, the user said “commit”
  on 2026-11-18. This authorizes one commit of the reviewed tests, helpers, and documentation;
  it does not authorize a push or later task.

## Preparation history

Prepared for review on 2026-11-18 at Git HEAD `b0ee436`. Read-only inspection covered the existing
domain, quotation, analysis, snapshot, transport, CLI checks, and M1-03/05/06 evidence. The pinned
official sources above were read; no new live RPC or behavioral verification was run.

Only this task document and backlog/current-state navigation are changed. No application code,
test/helper/scaffold, dependency installation, private configuration, evidence artifact, commit,
or push was introduced. The 116-test baseline and earlier live results remain prior evidence.
Implementation remains unapproved; the next action is review of this actual scope document.

Preparation checks passed: local links/anchors, whitespace, and defined CR references across
34 Markdown files (270 local links); unique R01–R08 cases; Proposed/unapproved task state;
`git diff --check`; exactly three documentation changes; and unchanged Git HEAD `b0ee436`.
Application, tests, manifests, lockfile, private configuration, and existing evidence are unchanged.
No behavioral tests were run for this documentation-only preparation.

## Evidence and handoff

Completed on 2026-11-18 under the explicit approval above. The requested reviewed-scope commit
was created first as `7a9b68b`; subsequent acceptance, test, and completion updates were
uncommitted at the first handoff. The user then explicitly requested their commit.
No push or M1-08/later task was started.

### Changed artifacts and actual coverage

The original 116 cases are preserved. **42 additional cases** bring the total to **158 across
eight test files**: 16 domain cases, eight quotation-wire cases, 17 analysis/failure cases, and
one added token1 identity case in the existing snapshot suite. The new transport helper is
test-only. Production source, scripts, package manifests, dependency versions, and `bun.lock`
are unchanged; none of the tested cases required a production correction.

| Case | New actual evidence | Reused evidence and limits |
| --- | --- | --- |
| R01 | [Domain boundary cases](../../packages/domain/test/validation.test.ts): micro-USDC, an amount beyond Number precision, exact `2^255 - 1` input and adjacent failure, malformed notation/duplicates, V2 zero/negative/range checks, and accepted/adjacent headroom cases | Existing domain grid rejection and [analysis configuration-before-I/O checks](../../apps/backend/test/analysis.test.ts) retain their role. No RPC is used. |
| R02 | The same domain file retains four literal unequal-reserve V2 vectors and a deterministic **205-tuple** property corpus. Each tuple checks exact fraction bracketing, output bounds, and monotonicity; extreme accepted headroom has a separate exact expectation | Existing small/floor-to-zero vectors remain. Literal outputs were independently derived with Python `fractions.Fraction` from the pinned library expression; expected results never call `v2Output`. The finite corpus is not a proof over every input. |
| R03 | [Quotation wire tests](../../packages/protocols/test/quotes.test.ts) check both V2 paths with independent large unequal-reserve outputs and all four V3 fee/direction tuples at a nonunit raw price, exact mixed units, selectors, gas, full-input and returned evidence. Wrong WETH/WETH9 contract metadata is rejected. [Snapshot checks](../../apps/backend/test/snapshot.test.ts) now also reject wrong token1 | Existing token0/decimals/factory/fee/spacing/structural checks remain. V3 wire replies are explicitly constructed marginal responses, not an independent V3 swap engine. Registry metadata is never rearranged to manufacture admission. |
| R04 | Domain checks cover nonintegral/reciprocal sqrt ratios and pinned TickMath endpoints, both fractional fee/direction thresholds, exact inclusive 100 bps and one-unit failure for both fees, and invalid/crossed/opposite price limits | Existing full-input, zero-output, and impact-rejection tests are retained. Bounds and tuple meaning follow the existing pinned sources; no policy changed. |
| R05 | [Analysis validation](../../apps/backend/test/validation.test.ts) verifies 36 unique route/input keys and exact USDC/WETH address/amount linkage. Two independently specified mixed-unit cycles check final amount and signed gross with no second fee deduction. Domain ranking checks reverse/rotate rows, all-negative/zero/mixed signs, gross rather than ROI/absolute loss, and size/route ties | Existing composition, positive/negative CLI presentation, partial-grid rejection, and unavailable-cost checks remain. The constructed profile is not an actual opportunity. |
| R06 | Six isolated first-leg faults (one-unit output mismatch, echoed input mismatch, wrong array length, truncated ABI, revert, absent result) preserve 34 successful rows and two blocked dependencies. Four selected second-leg faults (zero, truncated ABI, revert, absent result) preserve 35 successful rows. Tests assert exact reasons, rejected/unavailable distinctions, retained diagnostics, immutable source, and no best result | Existing whole-fixture full-fill/opposite/impact/zero/identity failures remain. A locally computed V2 amount can survive as a diagnostic when protocol comparison is unavailable; its dependent cycle remains unavailable. |
| R07 | Three running-analysis cases cover noncanonical quote evidence with other successful responses, hash replacement during renewal while a quote is pending, and unavailable final validation after a numerically complete grid. Invalidated records stay terminal and immutable; unavailable validation recovers only through explicit renewal | Existing snapshot freshness/rollback/canonicality boundaries and post-analysis invalidation tests remain. The live-mode renewal case uses an injected constructed transport from the start; it is offline fault injection, not new live evidence. |
| R08 | Active cancellation sends only three quote requests, retains all 36 terminal rows, and ignores later replies. A 429 retry is preceded by fresh validation at the same hash; final three control reads are retained. Expiry/deadline during renewal withholds admission and best result. Actual wire parameters and read/send caps are asserted | Existing [RPC checks](../../packages/protocols/test/rpc.test.ts) cover queued concurrency, timeouts, late replies, retry bounds, and exhausted-budget final-control reservation; existing analysis checks cover shared peak concurrency. The new checks use controlled clocks/barriers/fake timers, with no network or deliberate wall-clock sleeps. |

[`validation-fixture.ts`](../../packages/protocols/test/validation-fixture.ts) supplies explicitly
constructed state and protocol replies for the analysis cases. V2 replies reuse the production
calculator to keep fixture plumbing small; independent V2 correctness comes from R02 and R03,
not from comparing that fixture to itself. V3 marginal replies include the fee and serve as
specified inputs to adapter/composition checks. No new quotation authority is introduced.

For the mixed-unit literals, a constructed 10 USDC V2 → V3-500 path supplies
**4984975149898877 WETH base units**, then **7971972 USDC base units**, gross **-2028028**.
The reverse venue path supplies **6246875000000000 WETH base units**, then **12456191 USDC
base units**, gross **2456191**. These are constructed test expectations, not market observations
or available net profit. The V2 property corpus is the fixed cross product in the domain test;
there is no nondeterministic seed. Failure messages retain the exact input/reserve tuple.

### Actual commands and outcomes

| Command/check | Actual result |
| --- | --- |
| `bun run test -- packages/domain/test/validation.test.ts` during initial development | Passed the initial 15 arithmetic cases; the final file has 16 cases after adding the explicit inclusive endpoint for both fees. |
| Targeted type/test iteration | Test-only TypeScript tuple/ABI inference issues and an overly strict cancellation expectation were corrected. The initial targeted run had 72 passed/one failed; no production correction followed. |
| Final `bun run format && bun run check` in the workspace | Passed runtime pins, strict root/domain/protocol/backend TypeScript, Biome formatting/lint (42 checked files), and **158 tests in eight files**. |
| Clean `bun install --frozen-lockfile && bun run check` | Passed in `/private/tmp/pooltrace-m1-07-249m09u2` without `.env`, `.env.local`, `.git`, `data`, or copied dependencies. Installed 110 packages; all **158 tests** passed. Sandbox elevation was needed for install cache/temp access. |
| Production-change and reproducibility review | Production source/scripts/manifests are unchanged. Tested source/configuration match the clean copy; the lockfile, brand reference, and Git HEAD are unchanged after the requested scope commit. |
| New live/RPC checks | Not run: no production behavior changed, so the conditional live rerun gate was not triggered. Earlier M1-03/05/06 evidence remains explicitly historical. |

The cancellation test initially confused logical quote records with actual network sends and
assumed that every unavailable quote discards all numeric diagnostics. The accepted behavior
retains cancelled records for unsent work and local V2 calculations while withholding cycle
amounts, admission, and ranking. Assertions now distinguish those facts: only three quote sends,
all 36 cycle outputs/gross unavailable, cancellation reasons, absent V3 output, no extra sends
after late replies, and no authoritative best. The pending-response helper was also limited to
the controlled three requests and uses actual request IDs. These were test corrections, not
evidence of a production defect or grounds to weaken the accepted contract.

The unchanged `bun.lock` SHA-256 is
`915b2f3f4baa2461b0e87e4796eaa1d27771c12b4189ddb211e0e38e939c1870`.
Node 26.3.1, Bun 1.3.11, TypeScript 7.0.2, viem 2.57.20, and Vitest 5.1.0 remain pinned.
No dependency, property-testing framework, or new application command was added.

### Integration evidence and remaining limits

Reuse [M1-05's actual live grid/replay/expiry evidence](M1-05-quotation-and-cycle-analysis.md#evidence-and-handoff)
and [M1-06's actual CLI output](M1-06-cli-and-configuration.md#evidence-and-handoff). No new
live admission, liquidity, finality, execution, profitability, or capture claim is made. Existing
reports are as-of events; they cannot establish current eligibility. No required M1-07 check
remains failed or unverified; the conditional production-change integration rerun was unnecessary.

Finite regression tests are not formal verification. V3 execution, wallets/transactions, forks,
full-transaction costs/net-profit production, archive ingestion, storage, and service/UI work
retain their separately approved tasks. No prior evidence or private configuration was changed.
The next proposed action is preparing M1-08's documentation scope for review; it has not started.

Final handoff checks passed: local links/anchors and CR references across 34 Markdown files
(282 local links), whitespace, `git diff --check`, credential scan of all 10 changed/new files,
completed R01–R08 criteria, exact source/configuration equality with the tested clean copy,
unchanged production/evidence/lockfile/brand reference, no staged files, and pre-commit Git HEAD
`7a9b68b`.
