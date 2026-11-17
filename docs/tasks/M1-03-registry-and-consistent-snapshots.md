# M1-03: Registry verification and consistent snapshots

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md)
- Requirement IDs: CR-02 (identity/structural evidence only), CR-03, CR-09, CR-10; exact amounts
  and units under CR-01 in [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed M1-01/M1-02, accepted ADR-0005, explicit approval of this implementation scope,
  and a suitable user-configured RPC endpoint for the required live completion gate

## Outcome

A testable backend/protocol slice that discovers and verifies the selected Ethereum WETH/USDC
pool candidates, collects their state against one canonical block hash, and reports complete,
rejected, stale, invalidated, and unavailable outcomes with traceable provenance.

This is the first application implementation slice. It produces identity and structural liquidity
evidence for later quotation work. Finite-trade suitability remains explicitly unavailable; the
three-pool analysis workload is not admitted until M1-04/05 supply the required qualification.
M1-03 must not claim that its preliminary screens establish all of CR-02.

## Scope

The implementation follows the accepted ADR-0005 policy without changing its consistency or admission decisions.
The ADR owns candidate identities/fees, thresholds, defaults, consistency rules, and failure semantics.

| Deliverable | Bounded implementation |
| --- | --- |
| Working packages | Introduce the actual protocol and backend packages needed by this slice under ADR-0001. Configure exports, TypeScript checks, meaningful Vitest tests, and root verification commands for the code that exists. |
| Dependencies/configuration | Pin viem's accepted integration baseline; select a compatible Vitest version using current official sources. Preserve Bun and its lockfile. Add validated backend RPC/provider-label and policy configuration guidance, with credentials in ignored local environment files. |
| Candidate registry | Implement source-backed token/factory expectations, hash-bound factory discovery, code/metadata/token-order/fee/spacing verification, and structural V2/V3 screens. Preserve the configured three candidates and report failed admission honestly. |
| Pinned reader | Implement the strict block-hash/canonical selector boundary, required provider capability probes, bounded concurrency/retries/timeouts/deadline, fresh chain/header validation, and cancellation/late-response handling. |
| Collection and revalidation | Provide one-attempt orchestration and explicit validation/invalidation behavior. Keep block age, head lag, validation age, completeness, structural screening, and data origin distinct. No scheduler or always-running collector is required. |
| Evidence/handoff | Preserve the semantic provenance and exact quantities required by ADR-0005, with sanitized failure details and nonsecret provider labels. Supply traceable observation/lifecycle results to future quotation/storage work without implementing those consumers. |
| Validation and guidance | Implement the applicable V01–V18 checks and read-only live gate from the linked validation plan. Document actual commands, configuration, observed evidence, failures, and limitations. |

Keep RPC and external I/O in protocol/backend modules. Pass clocks and external state explicitly
to policy logic so failures and time boundaries can be tested. Root checks must cover the new
packages; the M1-01 scripts-only type-check cannot stand in for application verification.

The live gate may make read-only RPC calls to the explicitly configured endpoint once this task
is approved. The user selected Alchemy for the initial Ethereum workload and reports configuring
an endpoint. Its chain/capabilities were unverified during preparation and have now been checked
below. Do not record credentials in
chat, reports, fixtures, or logs; configuration instructions should use the ignored backend
environment file. Check current official APIs again during implementation, especially the pinned
viem release's behavior with the existing Node.js/TypeScript toolchain.

## Outside scope

- V2/V3 quotation adapters, official-quoter integration, cycle/profit calculations, price-impact
  admission budgets, and finite-size workload qualification (M1-04/05).
- A public market-data CLI, HTTP API, SSE, UI, or background startup/shutdown workflow (M1-06/11/12).
- SQLite drivers, schemas, migrations, or an application evidence store (M1-09/10). Integration
  reports linked from task evidence do not constitute a persistent application database.
- Full V3 tick traversal, aggregation/failover redesign, additional chains/tokens/venues, contracts,
  fork execution, transaction submission, benchmarks, deployment, and CI/CD.
- Placeholder packages unrelated to this slice. No domain or frontend package is needed merely to
  populate the target directory layout.
- Commits. Only the user creates commits; no push is authorized.

## Decisions and remaining dependencies

ADR-0005 was accepted on 2026-11-17, including its strict consistency policy and staged admission
boundary. Do not ask for that same design acceptance again within this scope.

On 2026-11-17 the user selected a single Alchemy Ethereum endpoint for now and requested future
support for multiple providers, fallback, and additional chains. This keeps M1-03 within ADR-0005's
single-provider Ethereum scope. The endpoint value was not inspected or copied into documentation;
its configuration is user-reported until the approved live checks run.

Use the selected RPC/module boundary so later work can replace or extend provider
configuration. Future resilience and chain expansion are tracked in the backlog; do not add a
provider-fallback system or a generic multi-chain framework to this task.

The user accepted keeping RPC access in a distinct module inside the backend for M1-03. RPC-01
will evaluate extracting that boundary into a separate blockchain gateway process for shared
consumers and independent operation. No gateway process, service API, or additional application
process is part of this task; ADR-0004's initial topology remains in effect.

Actual pool addresses, provider capabilities, observed structural state, and runtime compatibility
were unverified at preparation. The implementation evidence below records their actual results.
A missing RPC endpoint does not prevent
useful offline implementation/verification, but it prevents satisfying the proposed live completion
gate. Unsupported consistency capabilities require an explicit failure; they do not authorize a
weaker fallback. A material departure from ADR-0005 needs a reviewed design change.

## Acceptance criteria

- [x] The user has accepted the governing design in ADR-0005.
- [x] The user has explicitly approved this bounded implementation scope.
- [x] The necessary packages install reproducibly with Bun and its lockfile, and documented
  verification commands cover the actual application code and preserve the foundation checks.
- [x] Source-backed candidates are discovered/verified at a recorded block hash; incorrect or
  unavailable chain/contract/token/pool/liquidity evidence produces the accepted explicit outcomes.
- [x] Every state read and retry carries the required hash/canonical selector, and fresh
  post-validation, temporal gates, invalidation, and unavailable-validation behavior are demonstrated.
- [x] Actual request counts/concurrency/cancellation behavior satisfy the accepted operational limits;
  missing results and failed reads never become fabricated zero-valued successes.
- [x] Meaningful offline checks cover V01–V18 in the existing validation plan, including boundary
  values, rejected/partial observations, reorganization responses, origin, and credential sanitization.
- [x] The required read-only live gate records a usable registry/snapshot run and honest unavailable/
  expired-use evidence with real provenance. Missing/failed required integration keeps the task
  incomplete unless the user explicitly revises its scope; fixtures cannot count as live evidence.
- [x] Observation and lifecycle information preserve exact quantities/units, source/policy revisions,
  times, read outcomes, and the distinction between structural screens and finite-size suitability.
- [x] The handoff reports structural evidence only, with finite-size suitability/full CR-02 evidence
  still pending M1-04/05; no pool substitution or premature workload admission is hidden.
- [x] Actual commands/results and limitations are recorded here, setup guidance is usable, and the
  backlog/current state are updated without starting another task.

## Planned validation

Use the canonical [M1-03 validation plan in M1-02](M1-02-registry-and-consistent-snapshots.md#m1-03-validation-plan)
for expected offline and live outcomes; do not copy its matrix into competing test specifications.
Add meaningful tests to the approved packages, then run the documented root/package checks and
frozen-lockfile installation. Inspect request selectors and retry counts through the actual
transport boundary, using controlled responses and clocks for offline failure cases.

Run the live integration gate only in its explicit mode against the user's configured read-only
endpoint. Record actual block/chain identities, observations, capability checks, validation results,
and sanitized evidence. Keep live, historical, and fixture origins clear. Do not claim a controlled
mainnet reorganization test from an offline response scenario.

Review the resulting dependency boundaries and changed-file scope. Record passed, failed, skipped,
and unavailable checks separately. Application testing alone is not formal verification or proof
that an apparent opportunity could have been captured.

## Approval record

- Review preparation: Prepared after ADR-0005 acceptance as the concrete next implementation scope.
  This task record does not manufacture implementation approval.
- Design acceptance: Granted on 2026-11-17 when the user said “i accept adr5”; recorded in ADR-0005.
- Implementation approval: Granted on 2026-11-17 for M1-03 only.
- Approved implementation scope and user instruction: “i accept m1-03”. This authorizes the bounded
  registry/snapshot implementation, dependency installation, offline tests, and configured read-only
  live integration gate. It does not authorize subsequent tasks, a gateway process, commits, or pushes.

The earlier endpoint/future-direction clarification supplied configuration context, not approval to
implement this task. The subsequent explicit M1-03 approval above authorizes this implementation.

On 2026-11-17 the user replied “ok” to the recommendation to isolate RPC access inside the backend
now and evaluate a separate gateway process in RPC-01. This accepts the direction described above;
that earlier direction acceptance did not itself approve implementation. M1-03 was approved
separately as recorded above; a future gateway remains unapproved.

## Preparation history

These notes describe earlier documentation-only handoffs, before the explicit implementation approval.
No application code, dependencies, tests, or live RPC calls were introduced during preparation.

Preparation checks passed on 2026-11-17: local links/anchors, whitespace, and CR references across
29 Markdown files; `git diff --check`; accepted-design/proposed-task approval states; and confirmation
that changes are documentation-only with foundation files and Git HEAD unchanged. These checks
validate this review artifact, not M1-03 application behavior or integration.

Provider clarification recorded on 2026-11-17: Alchemy is the selected initial provider; future
multi-provider fallback and additional chains are recorded in product/roadmap/backlog documentation.
No endpoint value was read, disclosed, changed, or tested, and no implementation approval was added.
Clarification checks passed: links/anchors, whitespace, and CR IDs in 29 Markdown files;
`git diff --check`; unique RPC-01/RPC-02/CHAIN-01 backlog entries; and M1-03's unchanged Proposed/
unapproved state. Exactly six Markdown files changed; foundation files and Git HEAD `172a81c`
are unchanged. These are documentation checks, not endpoint capability or integration evidence.

Gateway-direction clarification recorded on 2026-11-17: the current boundary is an internal RPC
module; future process extraction is a design question for RPC-01. Product, roadmap, backlog,
and current state reflect that direction. No implementation or approval state was advanced.
Links/anchors, whitespace, and CR checks passed across 29 Markdown files; `git diff --check`
passed. M1-03 remains Proposed with implementation unapproved; cumulative changes remain six
documentation files and Git HEAD `172a81c` is unchanged.

## Evidence and handoff

Completed on 2026-11-17 under the explicit approval above. No subsequent task was started; all
changes remain uncommitted. Git HEAD remains the user's `dee5c07`; no commit or push was made.

### Implemented behavior and use

- [`packages/protocols`](../../packages/protocols/src/index.ts) implements sourced expectations,
  factory discovery, code hashes, observed decimals/identity, V2 reserves, full V3 `slot0` and current
  liquidity, and independent identity/structural check outcomes. No pool address is hardcoded as a
  verified deployment; the configured factories discover all three candidates at the selected hash.
- [`apps/backend`](../../apps/backend/src/index.ts) implements validated private configuration,
  one-attempt collection, deep-frozen observations, eligibility calculation, and append-only
  revalidation events in newly returned observations. Confirmed invalidation is terminal for that
  attempt; unavailable validation can recover without rewriting history.
- All contract/code reads, including retries, require `blockHash` plus `requireCanonical: true`.
  Both methods undergo positive and constructed unknown-hash probes. Unknown probe inputs are
  retained as test inputs, never described as observed chain blocks. No number/latest state fallback,
  alternate endpoint, substituted candidate, automatic fixture mode, or transaction path exists.
- The bounded HTTP reader owns the four-request semaphore, 5 s request timeout, 20 s attempt deadline,
  one transient retry with 250 ms minimum/valid longer Retry-After, and cancellation/late-result handling.
  viem's custom transport has retries disabled; direct fresh chain/header requests share those limits.
  This refines ADR-0005's HTTP/getBlock plumbing without changing its consistency or policy decisions.
- Observation metadata includes source/configuration/policy/implementation/dependency revisions,
  chain/block/timing, checks, runtime code hashes, exact bigint quantities, sanitized per-send outcomes,
  and nonsecret provider labels. JSON uses decimal strings for bigint. Token addresses/observed decimals
  identify reserve base units; V3 price is Q64.96 and liquidity remains a protocol quantity.
- [`README` setup](../../README.md#development-setup), [engineering notes](../ENGINEERING.md#registrysnapshot-integration),
  and `.env.example` document offline checks and the explicit read-only `bun run check:live` harness.
  The harness writes ignored per-attempt reports, never an application database or public market CLI.
  Monotonic times are process-local; serialized reports are past evidence rather than reloadable live state.

### Commands and offline evidence

| Actual check | Result |
| --- | --- |
| `bun install` after adding exact dependencies | Passed; viem 2.57.20, Vitest 5.1.0, workspace dependencies, and generated `bun.lock` installed |
| `bun install --frozen-lockfile` in an isolated source copy without `.env`, `.git`, `node_modules`, or live data | Passed; 110 packages installed; lockfile unchanged |
| `bun run check` in the workspace | Passed: runtime pins, root/protocol/backend TypeScript, Biome lint/format, and **50 tests across two files** |
| `bun run check` in the isolated clean installation | Passed with the same 50 tests; no endpoint/configuration required |
| `bun run check:live` against the configured Alchemy endpoint | Passed: live usable registry/snapshot, historical exact-state replay, and real elapsed validation expiry/revalidation |

The initial sandboxed live run reported `network` and failed rather than switching to fixtures.
The authorized network-enabled run succeeded. Bun installation also required approved access to its
cache/temporary directories. Early type/lint failures were fixed: Node-compatible erasable syntax,
ABI typing, environment typing, test narrowing, and iterable callbacks. `ox`'s WebAuthn declarations
require DOM type names in the shared compiler library; `skipLibCheck` remains false and Node remains
the runtime. No failed implementation check is being counted as a pass.

[`snapshot.test.ts`](../../apps/backend/test/snapshot.test.ts) and
[`rpc.test.ts`](../../packages/protocols/test/rpc.test.ts) exercise the existing V01–V18 plan:

| Plan coverage | Executed evidence |
| --- | --- |
| V01–V03 | Configuration rejection, actual viem hash/canonical wire calls, ignored-hash provider rejection, wrong chain before/after collection, missing/malformed/contradictory headers |
| V04–V07 | Empty versus unreadable code, zero discovery, token order/decimals/factory mismatches, disabled/mismatched fee spacing, duplicate identities, zero reserves/price/liquidity and locked V3 screens |
| V08–V12 | Head advances while reads stay hash-bound, distinct immutable attempts, replacement/noncanonical invalidation, unavailable/recovered validation histories, fresh request counts, age/lag/validation/future boundaries and clock rollback |
| V13–V15 | Actual viem retries for network/429/503, valid Retry-After, terminal failures, timeout despite ignored abort, four-request concurrency, queued/active cancellation, deadline and late responses, complete rejected/unavailable payloads |
| V16–V18 | Exact large integers in JSON, source/token/code/policy provenance, live/historical/fixture separation, credential sanitization, and finite-size suitability unavailable/workload admission false |

These are constructed offline responses, not market/fork evidence.

Final handoff checks passed: local links/anchors, whitespace, and CR references across 29 Markdown
files; `git diff --check`; credential scan of the preserved report and changed source/documents; and
review of package boundaries, ignored local files, and unchanged Git HEAD. Both workspace and clean
installation retain lockfile SHA-256 `b1085c7ac8fe6113d01f26ac2737ee7e96c33969bcb04aa3e71b56096e674144`.

The unchanged logo hash is
`b45aa4306ed34de83f59a0b3bb13035a33cfb9b77eb370aea6220c1cea91442f`.

### Recorded live integration

The [sanitized report](../evidence/M1-03-live-2026-11-17.json) preserves the actual observation,
historical replay, revalidated record, and as-of eligibility outcomes. It is past evidence, not a
claim that this block remains fresh. Source/configuration labels are `ethereum-weth-usdc-v1`,
`alchemy-ethereum-v1`, and `adr-0005-v1`; viem is 2.57.20 and implementation is `m1-03-v1`.

- Attempt: `e4cc160c-be23-463c-898d-a1381fa38f26`; origin `live`, chain ID **1**.
- Block: **26436521**, hash `0xdb4de7b46f3ebfccdca32d9f232d01b958b39fe23b49240cabcc8c2e714c67d7`;
  timestamp **1794939647** seconds; parent hash is retained in the report.
- Collected 2026-11-17 **18:20:59.106–18:21:03.023 UTC**; monotonic elapsed **3916.312333 ms**.
- Both `eth_getCode` and `eth_call` accepted the selected canonical hash and rejected the recorded
  constructed unknown-hash probe. The initial attempt made **41** sends with no transient retries;
  the two expected negative probes are recorded as `state_unavailable`.
- **31** registry checks passed, **7** observed runtime code hashes were retained, and the payload
  was complete with identity/structural status passed and no attempt failures.

| Factory-discovered pool | Observed address |
| --- | --- |
| V2 USDC/WETH, standard fee 3000 millionths | `0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc` |
| V3 USDC/WETH, fee 500 millionths | `0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640` |
| V3 USDC/WETH, fee 3000 millionths | `0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8` |

The initial eligibility check was canonical/valid and fresh: block age **16025 ms**, head lag **1**,
validation unexpired. The explicit historical re-read made 41 sends and returned identical pool
state and code hashes at that same block. After waiting beyond the actual five-second validation
window, the original validation was expired. `prepareForUse` made three new chain/header sends and
returned two retained validation events with valid canonicality, age **24229 ms**, lag **1**, and
unexpired validation. Both as-of live qualification checks passed; **finite-size suitability remains
unavailable and workload admission remains false** throughout.

### Remaining limits and next proposed action

This supplies identity/structural evidence, consistent collection, and lifecycle checks. It does not
establish all of CR-02, quote/finite-size admission, profitable cycles, transaction costs, security
of external contracts, independent provider truth, finality, or execution/capture. No controlled
mainnet reorganization was observed; reorganization/cancellation failures were exercised offline.
The single endpoint's behavior was verified for these runs, not guaranteed for future requests.

The next proposed task is M1-04's quotation/cycle/profitability and finite-size admission design.
It requires separate approval and has not started. Only the user creates commits.
