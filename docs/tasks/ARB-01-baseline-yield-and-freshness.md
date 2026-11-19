# ARB-01: Baseline route yield and collector freshness

- State: Proposed — scope prepared; implementation and live experiment await review
- Milestone: ARB — baseline increment within opportunity discovery
- Related ADRs: accepted [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md),
  [ADR-0007](../adr/0007-minimal-sqlite-evidence-store.md), and
  [ADR-0008](../adr/0008-local-api-sse-and-process-interface.md)
- Requirement IDs: CR-01 through CR-06, CR-09 through CR-11 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: completed M1 collector, quotation engine, and evidence store; working configured
  Ethereum RPC access for the live experiment; approval of the concrete scope below

## Outcome

Measure how often the current workload produces positive gross USDC and whether the collector
finishes soon enough to expose those results as eligible live observations. Deliver reproducible
results for two predefined windows, including negative results and coverage failures, then propose
M2-01 priorities. Positive gross is not an acceptance condition.

This task completes the baseline increment, not the whole opportunity-discovery milestone.
The evidence and decision below satisfy ARB-05's reporting intent for this increment only;
ARB-02 through ARB-05 remain available for subsequent separately scoped research.

## Scope

### 1. Frozen control workload

- Ethereum mainnet through the existing single user-configured provider. Preserve sourced registry
  identities, hash-bound reads, capability checks, and all existing financial and freshness policy.
- The existing V2 pool and V3 500/3000 fee tiers, both venue orderings, and exactly six USDC inputs:
  **10, 50, 100, 500, 1000, 5000**. This produces 36 route/size outcomes per selected block.
  Pass these sizes explicitly; do not inherit an accidental local size override.
- Use the existing serial collect/analyze/save pipeline with its **10,000 ms delay after an
  attempt finishes**. Preserve revalidation, producer exclusion, exact arithmetic and all-36
  workload admission. The delay is not a fixed start-to-start polling interval.
- Freeze the source revision/diff identity, runtime versions, registry, quote policy, normalized
  sizes, provider/configuration labels, and experiment settings in a manifest before sampling.
  Source or workload changes invalidate a matched comparison and require a separately identified run.

### 2. Bounded experiment protocol

The values below are proposed experiment settings, not measurements or claims of provider capacity.

| Setting | Proposed value |
| --- | --- |
| Live windows | Two non-overlapping windows of 128 consecutive block heights each |
| Start selection | Arm window 1 at verified latest header H; start at H.number + 2, end at start + 127 |
| Second window | Arm after window 1 closes; start at max(new H.number + 2, window 1 end + 1), end at start + 127, regardless of yield |
| Head observation | HTTP latest-header polling every 2,000 ms; one observer request at a time, no catch-up bursts |
| Per-window wall limit | 45 minutes from arming, including waiting for the start and reconciliation |
| Per-window send limit | 20,000 actual RPC sends, including polling, collection, quotes, retries and reconciliation |
| Reconciliation reserve | Reserve 1,000 of those sends and the last 5 minutes for closing/reconciling; stop launching analysis earlier |
| Preflight | At most 2 minutes and 300 RPC sends, excluded from the windows but included in reported total resource use |
| Whole experiment ceiling | Two windows plus preflight: 40,300 sends and 92 minutes, followed by owned cleanup |

Select windows prospectively and write their exact boundaries before their first target block.
Do not select historical windows by known price movements or extend a window until it yields a
candidate. Use both windows as planned; the second tests repeatability even if the first is empty.
There is no automatic third window or replacement for an interrupted/low-coverage one.

Preflight verifies the configured chain/capabilities and pipeline access using the same workload,
without selecting windows based on its financial result. Missing credentials, unsupported reads
or failed preflight leave the live experiment unperformed, with the actual reason recorded.
Do not create new provider credentials, change subscriptions or substitute fixtures.

Stop starting work when the provider has moved beyond the final height, the collection budget
is exhausted, the closing reserve begins, cancellation occurs, or a fatal configuration/storage
error arises. Keep any already selected in-window attempt within the remaining hard budget and
existing deadlines. A selected out-of-window block is recorded as overhead, excluded from yield,
and never substituted for a missing target block. End the run on the hard limit even if closing
checks are unavailable. Cleanup releases only owned resources; no hard bound is claimed for
uninterruptible filesystem/OS work.

Cancellation or a fatal configuration/storage/journal failure stops the whole experiment;
do not arm another window in that invocation. If a nonfatal budget/time stop ends window 1 early,
window 2 still obeys the non-overlap rule and its own waiting/closing budget. Never move its start
backward to collect more samples.

### 3. Narrow research tooling and measurement

- Add one bounded research entry point owned by the backend, invoked through Bun, reusing the
  actual M1 pipeline and producer guard. It replaces the normal service as producer for its
  dedicated research database; do not run competing collectors or introduce another quote engine.
- Add the minimum timing/head-observation instrumentation and offline reporting needed by this
  experiment. Keep the ordinary service/API/browser behavior unchanged. Head observations measure
  timing and do not trigger collection or choose a different state for an ongoing attempt.
- Use the existing bounded HTTP reader and the same configured endpoint. Count actual sends at
  dispatch, including retries and failed sends. Share a run-wide send limiter and at most four
  in-flight requests across observer and pipeline work; retain existing per-phase limits.
  Observer requests must not starve required canonicality/final validation or bypass deadlines.
- Record local wall and monotonic receipt times of latest-header responses and their actual
  cadence. First seen means first seen by this observer, not network propagation or block creation
  time. Polling misses, pauses and observer interference remain part of the reported limitation.
- Record collection start/end, quote start/end, completion-time eligibility/age/head lag,
  attempt IDs, source block headers, all outcome reasons, and collection/quote/observer/reconciliation
  send counts separately. Head lag uses the pipeline's fresh validated head; observer samples are
  supplementary and cannot establish canonicality or replace required validation.
- Keep authoritative observations/analyses in the existing SQLite schema. Store the manifest,
  append-only timing/attempt journal, header observations and closing reconciliation as versioned
  research artifacts referencing saved observation/analysis revisions. No migration or rewrite of
  immutable financial evidence is needed. Do not silently reconstruct missing measurements.
- Stop on journal/storage failure, retain partial artifacts, and mark the experiment incomplete.
  Offline reporting checks references, configuration identity, counts and artifact integrity;
  missing or incompatible evidence cannot silently become an eligible sample.

All live RPC work stays in the single backend process. Offline reporting uses stored evidence
without RPC. The additional observer consumes RPC/concurrency and may affect latency; report that
overhead rather than claiming to measure an entirely uninstrumented service.

### 4. Counting, reconciliation and report

Use block heights, not attempts, as the window denominator. At close, resolve canonical headers
for the predefined heights through the existing bounded reader. Retain every observed hash and
replacement. Unresolved canonicality remains unknown; it is neither proof of a reorg nor a usable
yield sample. Historical closing checks do not restore live eligibility or fill missing quotes.

For each final canonical block hash, the first pipeline attempt selecting that hash is the primary
sample, chosen independently of its outcome. Retain duplicate attempts and their cost, but never
replace a failed/negative primary with a later successful/positive attempt. Orphaned hashes remain
diagnostics and are excluded from canonical yield. Report the closing-check time: canonicality is
as-of evidence, not a finality guarantee.

Account for each of the 128 target heights exactly once in a coverage table: qualified live primary;
attempted primary but ineligible; seen by observer but not attempted; not seen/not attempted; or
canonical identity unresolved. Split attempted-ineligible results by stale, rejected, incomplete,
validation unavailable and invalidated outcomes with a documented precedence for overlaps. Report
attempts without a selected block separately. Retain orthogonal flags and raw reasons in artifacts.

The report must include:

- Exact window boundaries/hashes, runtime/source/configuration identity, execution/stop reasons,
  all coverage counts, duplicate/orphan counts, and denominators for every rate.
- Positive-gross block count divided by qualified primary blocks; also give qualified coverage
  over all 128 target heights. If no block qualifies, the yield rate is unavailable, not zero.
- Per-route/size gross distributions and per-block best tested gross/size, with exact USDC units,
  sample counts and deterministic integer ordering. Pool fees and price impact are already in
  quoted outputs. Separate zero/negative results; preserve rejected/unavailable outcomes.
- Timing distributions for collection, quote phase and total completion; observer-first-seen to
  completion when measurable; completion block age/head lag; poll gaps and missing timing.
  Use monotonic elapsed times and declare the percentile convention. Reject invalid clocks.
- RPC logical reads and actual sends by category, retry/failure counts and observer overhead.
  Provider compute units or monetary cost remain unavailable unless actually metered; send counts
  are not a fabricated billing figure. Transaction costs and net profit remain unavailable.
- A comparison of both windows. Identify recurring positive route/size results if they exist,
  and report non-repetition honestly. Replaying the same block is not independent repetition.

Predeclare these diagnostic targets **per window**: observer coverage at least 90% (116/128),
qualified live primary coverage at least 75% (96/128), quote-phase p95 at most 10,000 ms, and
completion head-lag p95 at most one block. These are research targets, not changes to ADR-0005/0006
eligibility. Failure must be reported and limits the conclusion; do not loosen the policy, remove
sizes or add windows to pass. Percentiles with no eligible measurements are unavailable.

The closeout can meet acceptance with zero yield or unmet diagnostic targets when measurement,
accounting and limitations are complete. Insufficient coverage supports a collector/coverage
finding, not a claim that the market has no arbitrage. Budget-stopped partial windows remain
partial; a completed offline harness alone does not fulfill the live-evidence criteria.

### 5. Evidence and M2 handoff

Keep full raw databases/journals in ignored local research output; preserve them for reproduction.
Archive selected sanitized manifests, coverage/metric summaries and a concise report under
`docs/evidence/`, with content hashes and reproduction instructions. Never include RPC URLs,
headers, keys or raw provider errors. The report states how the archived summary can be checked
and which full local artifacts are required for complete reproduction.

Propose M2-01 validation cases from measured routes/sizes and failure patterns. Recurring positive
gross can prioritize cost validation; an all-negative baseline can still inform executor safety,
quote-versus-execution and rejection tests. Do not turn constructed success cases into market
evidence. Explain the end-of-block blind spot and remaining competition/inclusion uncertainty.
Recommend continue, revise or pause for this research line. M2-01 is the next proposed task,
not an automatic start or an approval of M2 implementation.

## Outside scope

Additional pools, fees, sizes, protocols, pairs or chains; changing quote/admission/freshness policy;
new-head-triggered collection or polling optimization; provider fallback/WebSockets/mempool feeds;
historical quote backfill and intra-block replay; executor/Anvil, transaction submission or gas/net
production; UI work; general storage migration/recovery/export infrastructure; backend performance
benchmarks; dependency upgrades; hosting; commits, pushes or PR publication.

## Decisions and open questions

Existing accepted ADRs continue to own snapshot, quotation, persistence and producer behavior.
This task proposes an experiment protocol and narrow instrumentation within those boundaries;
it does not propose a replacement architecture or require a new ADR solely for the research run.
If measurement cannot preserve the existing concurrency, qualification, storage or ownership
boundaries, surface the material design change for review before implementing it.

Provider availability and real RPC consumption are unverified for this experiment. Window hashes
and exact runtime/source identities are populated by execution, never invented during planning.

## Acceptance criteria

- [ ] The user approves the concrete implementation and bounded live experiment scope.
- [ ] The research entry point reuses M1 calculations, exact outcomes and producer exclusion,
  freezes the manifest/settings, and enforces shared send/concurrency/time budgets.
- [ ] Independent head polling and completion measurements retain explicit timing uncertainty,
  clock failures and overhead without changing collection scheduling or financial policy.
- [ ] Both predeclared windows are attempted and closed with actual evidence, or a concrete
  interruption/access failure is recorded and the unperformed criteria remain open.
- [ ] Unique-block accounting, canonical reconciliation, duplicate selection, missing data,
  all 36 outcomes and exact gross summaries reproduce from the retained artifacts offline.
- [ ] Budget/cancellation/reorg/storage failures preserve honest partial states and release owned
  producer resources; unrelated producers and existing evidence are preserved.
- [ ] Meaningful offline regression checks and repository checks pass; live measurements and
  fixture/failure checks are reported separately, with no invented billing/net/capture claims.
- [ ] A sanitized report and ARB-05-style decision record explain coverage, yield, timing,
  repeatability and limitations, then propose M2-01 without beginning it.
- [ ] Usage/reproduction documentation, task evidence, backlog, roadmap and status are reconciled
  for the actual disposition before review readiness and after an observed merge.

## Planned validation

| Case | Required evidence |
| --- | --- |
| A01 — scope/configuration | Explicit frozen grid/cadence; prospective non-overlapping windows; invalid options/configuration rejected; no fixture fallback or credential output |
| A02 — accounting | Hand-calculated cases with duplicate blocks, first-attempt failures, zero qualified blocks, partial grids, orphan/replacement hashes and unresolved canonical headers; exact counts, fractions and USDC summaries |
| A03 — timing | Controlled wall/monotonic clocks, observer misses, delayed/reordered receipts, missing timing and invalid clocks; correct latency/lag/percentile meanings without invented head arrival |
| A04 — limits/cleanup | Controlled sends/retries including observer and closing work; aggregate concurrency, reserved closing budget, deadline/cancellation, journal/SQLite failure and competing producer refusal; partial output and actual owned cleanup |
| A05 — reproduction | Offline report over saved artifacts with network disabled; repeat gives identical metrics; tampered/missing references or mismatched manifests fail clearly |
| A06 — repository regression | `bun run check` and relevant existing producer/storage/process regressions after implementation; no dependency installation or upgrade assumed |
| A07 — real experiment | Bounded preflight and two live windows with configured RPC, manifest, raw evidence, canonical closing checks and actual resource totals; target misses/interruptions retained |
| A08 — handoff | Sanitized archive and report match raw evidence; criterion dispositions and affected planning records agree; M2-01 remains separately gated |

## Approval record

- Documentation preparation: Approved on 2026-11-19 by **“ok lets do it starting with arb1”**, after
  the recommendation to prepare ARB-01's scope and acceptance criteria for approval.
- Established design: ADR-0005 through ADR-0008 remain accepted; no acceptance of new experimental
  parameters is inferred from those earlier decisions.
- Implementation and live experiment: Pending review of this concrete scope, including the
  additional head-observation instrumentation, two windows and resource limits above.
- Commit/push authorization: On 2026-11-19 the user instructed **“for now only commit and push to
  remote”**, authorizing the prepared documentation commit and its task-branch push. PR creation,
  research implementation/live sampling, M2 and additional ARB experiments remain unapproved.

## Preparation evidence and handoff

Prepared on 2026-11-19 after refreshing `origin/main`, at source baseline
`6d394e67c965bc84e944b59b80de27c850e7c1c2`. Read-only inspection confirmed:

- `apps/backend/src/service.ts` runs the shared CLI pipeline serially and sleeps after completion;
  `local-config.ts` defaults that delay to 10,000 ms.
- `analysis.ts` already records quote start/end/elapsed time, request evidence, exact cycle rows
  and completion eligibility inputs. Existing evidence has no independent head-arrival journal.
- `packages/protocols/src/types.ts` request records contain method, send sequence and outcome,
  without receipt timestamps. Existing SQLite codecs retain the M1 analysis evidence; the proposed
  research timing artifacts must reference it rather than silently changing its schema.

No research implementation, fixtures/tests, package changes, dependencies, process launch or live
sampling was performed during preparation. Documentation verification passed: `git diff --check`
for tracked changes, an explicit whitespace/conflict-marker check covering all four changed/new
documents, and a local Markdown target/anchor check covering 91 links across those four documents.
Scope, approval and handoff wording were reconciled across the task, backlog, roadmap and status.
Application tests were not run for this documentation-only preparation. The proposed next action
is review of this scope; execution results belong in a later implementation/evidence section
after approval.
