# ARB-01: Baseline route yield and collector freshness

- State: Done — implementation, two-window evidence and independent research closeout complete
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
results for two predefined windows, including negative results and coverage failures, with a
standalone assessment of baseline yield and collector freshness. Positive gross is not an
acceptance condition.

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

The values below are approved experiment settings, not measurements or claims of provider capacity.

| Setting | Approved value |
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

### 5. Evidence and research conclusions

Keep full raw databases/journals in ignored local research output; preserve them for reproduction.
Archive selected sanitized manifests, coverage/metric summaries and a concise report under
`docs/evidence/`, with content hashes and reproduction instructions. Never include RPC URLs,
headers, keys or raw provider errors. The report states how the archived summary can be checked
and which full local artifacts are required for complete reproduction.

Summarize measured route/size yield, recurring results, coverage gaps and collector timing against
the predefined targets. An all-negative baseline is a valid research result when the evidence
supports that conclusion. Do not turn constructed success cases into market evidence. Explain
the end-of-block blind spot and remaining competition/inclusion uncertainty. Record whether the
evidence supports the baseline conclusions or leaves them inconclusive. Completion depends on
this task's own acceptance criteria; selecting or preparing another milestone is not a deliverable.

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

- [x] The user approves the concrete implementation and bounded live experiment scope.
- [x] The research entry point reuses M1 calculations, exact outcomes and producer exclusion,
  freezes the manifest/settings, and enforces shared send/concurrency/time budgets.
- [x] Independent head polling and completion measurements retain explicit timing uncertainty,
  clock failures and overhead without changing collection scheduling or financial policy.
- [x] Both predeclared windows are attempted and closed with actual evidence, or a concrete
  interruption/access failure is recorded and the unperformed criteria remain open.
- [x] Unique-block accounting, canonical reconciliation, duplicate selection, missing data,
  all 36 outcomes and exact gross summaries reproduce from the retained artifacts offline.
- [x] Budget/cancellation/reorg/storage failures preserve honest partial states and release owned
  producer resources; unrelated producers and existing evidence are preserved.
- [x] Meaningful offline regression checks and repository checks pass; live measurements and
  fixture/failure checks are reported separately, with no invented billing/net/capture claims.
- [x] A sanitized report and ARB-05-style decision record explain coverage, yield, timing,
  repeatability, limitations and the conclusions supported by this baseline experiment.
- [x] Usage/reproduction documentation, task evidence, backlog, roadmap and status are reconciled
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
| A08 — handoff | Sanitized archive and report match raw evidence; criterion dispositions and affected planning records agree; closeout is assessed against this task's own acceptance criteria |

## Approval record

- Documentation preparation: Approved on 2026-11-19 by **“ok lets do it starting with arb1”**, after
  the recommendation to prepare ARB-01's scope and acceptance criteria for approval.
- Established design: ADR-0005 through ADR-0008 remain accepted; no acceptance of new experimental
  parameters is inferred from those earlier decisions.
- Implementation and live experiment: Approved on 2026-11-20 by **“i accept arb1”**, covering this
  independent task's instrumentation, offline reporting, validation and two bounded live windows.
- Commit/push authorization: On 2026-11-19 the user instructed **“for now only commit and push to
  remote”**, authorizing the prepared documentation commit and its task-branch push. PR creation
  and implementation were not authorized by that delivery instruction; additional ARB experiments
  remain unapproved. The instruction covered that prepared commit only, not subsequent changes.
- Scope clarification: On 2026-11-20 the user requested that ARB-01 stand independently, with no
  downstream milestone references or required follow-on work. This authorizes the documentation
  correction; implementation/live experiment approval was subsequently granted as recorded above.
- PR delivery: On 2026-11-20 the user said **“i think you can do a pr”**, authorizing publication
  of this task branch and a draft PR for the prepared implementation. This did not by itself
  authorize the implementation commit; the earlier permission covered only the planning commit.
- Implementation commit: On 2026-11-20 the user said **“yes commit but good that you asked”**,
  explicitly authorizing the prepared implementation commit. The separately authorized task-branch
  push and PR delivery follow that commit. Further code/review-fix commits still require their
  own explicit instruction under WORKFLOW.

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
Application tests were not run for that documentation-only preparation. At preparation time the
next action was scope review. Subsequent approval and implementation evidence are recorded below.

## Implementation evidence

Implementation and validation started on 2026-11-20 on the existing task branch. The independent
research command reuses `runCli`, the producer guard and existing SQLite evidence. Optional phase
and logical-read callbacks plus local retry dispatch metadata add measurements without changing
ordinary service output, quotation arithmetic, workload admission or database schema.

The backend research modules implement prospective windows, fixed collection delay, independent
HTTP head observation, priority/concurrency/send/time limits, an append-only hash-chained journal,
and offline reporting through a read-only SQLite connection. The report verifies revision
references, recorded completion eligibility, all route/input pairs, exact gross and leg composition;
it keeps unknown coverage and duplicate/orphan attempts separate. The README owns commands and
the analysis guide explains interpretation. No dependencies were added or upgraded.

### Executed validation

- `bun run research:arb-01 --help` passed without RPC or application configuration access.
- Pre-experiment `bun run check` passed on Node 26.3.1 and Bun 1.3.11: **297 tests across 14 files**,
  plus type checking, lint and formatting, with no lint warnings. The 15 new ARB-01 cases cover
  unique-block denominators, first failed attempts/positive duplicates, missing canonical state,
  orphan/inconsistent closing chains, invalid/late timing, exact large signed amounts, journal
  tampering/truncation, shared concurrency and body consumption, actual retry dispatch and closing
  reserve, queued/body cancellation, two prospective constructed windows through the actual
  pipeline, deterministic read-only reporting, invalid references/options, producer exclusion,
  cancellation before a second window, journal failure and observer authorization failure.
- The first sandboxed full check had 23 loopback `listen EPERM` failures in existing service and
  launcher tests. It was rerun with loopback permission; final full checks passed. These failures
  were environmental and were not recorded as successful tests. Initial implementation/type/lint
  and help-assertion issues were corrected before the final run.
- Constructed integration runs are labeled `fixture`, use temporary directories and keep live
  qualification unavailable. They are separate from the actual experiment below.

### Live experiment and tooling interruption

The approved `bun run research:arb-01 run` invocation uses the configured endpoint and dedicated
ignored directory `data/arb-01-25a541ba-0ce7-4f3d-9891-ef0785efc4a6`. Preflight completed at block
26452710 with usable saved evidence and 104 actual sends. Window 1 was prospectively armed for
26452712–26452839. The second window is selected by the approved rule after the first closes.
Window 1 collected 85 qualified primary blocks out of 128 (43 seen but not sampled), with all 128
canonical headers reconciled and no duplicates/orphans. None of the 85 qualified blocks produced
positive gross. Observer coverage was 128/128; quote-phase p95 was 7,292.13 ms and completion
head-lag p95 was one block. The 75% qualified-coverage target was missed (85/128 = 66.40625%).
Actual window sends were 9,909, with no retries or unresolved sends, plus 104 preflight sends.

After those closing reads, macOS Git stopped working because Xcode was being updated and its
license/components gate rejected the command. The runner's final source check consequently failed;
the original journal honestly retains `malformed` and `windows: 0`, with successful owned cleanup.
This did not erase the 128 closing headers or turn the missing second window into evidence.
The partial report validated offline, and the owner marker was absent after process exit.

The user reported the Xcode update and then “ok its done”. Git readback succeeded and the complete
source fingerprint still matched exactly (`e65ce3f6f369b1cb54e22ca11a86b16e0bdd62433918d11e3450a51f3db4aff1`).
All 34 frozen files were independently rehashed, matched and preserved in the run's `source/`
snapshot. `source-recovery.json` records that post-interruption proof and hashes of the unchanged
original journal/database. No license was accepted or developer-tool settings changed by the agent.

A narrow continuation was added to complete only the unstarted second window. It requires that
proof, a fully reconciled first window, retained source snapshot and unchanged financial pipeline
files. It writes a separately identified linked run, exposes the control revision and does not
claim a matched-source comparison. It cannot replace a partial window or add a third. Refreshed
preflight consumes only the original remaining preflight allowance (196 sends after the first
104), and the original overall wall deadline still applies, including the interruption.

Source-tool failures now report `source_identity_unavailable` explicitly. The post-recovery full
`bun run check` passed **300 tests across 14 files**, plus type checking/lint/formatting with no
warnings. Three additional regressions cover explicit source-tool failure, remaining continuation
budgets and rejection of partial windows/changed financial code. The continuation uses
`data/arb-01-91b9a7c3-5761-4952-8f79-7e778513e223` and prospectively selected window 2 as
26452944–26453071. Its refreshed preflight used 107 sends, so the two preflights used 211/300
in total. Window 2 completed with normal process exit and owned cleanup. Final metrics and
criterion dispositions follow.

### Final results and reproduction

The [research report](../evidence/ARB-01-baseline-2026-11-20.md) and
[sanitized exact evidence](../evidence/ARB-01-baseline-2026-11-20.json) archive actual results.
The original run/journal and its failed terminal were preserved; the combined report includes the
verified recovery proof and separate control/source identities. This is not a matched-source
comparison. The financial pipeline, grid, policies and provider/configuration labels match.

| Metric | Window 1 | Window 2 |
| --- | --- | --- |
| Block heights | 26452712–26452839 | 26452944–26453071 |
| Qualified primary blocks | 85/128 | 61/128 |
| Ineligible primary blocks | 0 | 4: 2 stale, 2 validation unavailable |
| Seen but not attempted | 43 | 62 |
| Not seen/not attempted | 0 | 1 |
| Observer canonical coverage | 128/128 | 127/128 |
| Positive-gross qualified blocks | 0/85 | 0/61 |
| Best tested gross | −0.005634 USDC | −0.010001 USDC |
| Quote-phase p95 | 7,292.13 ms | 11,036.29 ms |
| Completion head-lag p95 | 1 block | 2 blocks |
| Actual window sends | 9,909 | 7,767 |
| Duplicate attempts | 0 | 1, excluded from primary yield |
| Orphaned attempts / unresolved canonical heights | 0 / 0 | 0 / 0 |

In total, **146/256 blocks qualified**, yielding 5,256 qualified route/size results and no
positive-gross block in the qualified samples. Both windows missed the 75% qualified-coverage
target. Window 2 also missed the 10-second quote p95 and one-block lag p95 targets. These diagnostic
misses are recorded findings, not passed checks or grounds to alter eligibility or add samples.

Actual RPC use was **17,887 sends**, including 211 preflight sends, within all original send/time
caps. The elapsed wall interval including the Xcode interruption was 73.35345 minutes, below
92 minutes. Maximum active shared slots were four. Window 2 retained 14 actual retry dispatches,
request timeouts/deadlines and three observer timeouts; no sends were unresolved at close. Reader
outcomes include expected unknown-hash probes and refused dispatches, separately from actual sends.
Transaction costs, net profit and provider billing remain unavailable.

The actual commands were the original `bun run research:arb-01 run`, the guarded
`bun run research:arb-01 continue --run-dir data/arb-01-25a541ba-0ce7-4f3d-9891-ef0785efc4a6`,
and `bun run research:arb-01 report --run-dir data/arb-01-91b9a7c3-5761-4952-8f79-7e778513e223`.
The continuation and report exited 0. Rebuilding the complete report offline produced identical
bytes. Both SQLite hashes were unchanged, all 34/35 retained source files matched their respective
manifests, and both producer owner markers were absent. The selected archive passed an exact
private-RPC-URL/credential scan; raw databases/journals/source remain ignored local artifacts.

After collection, the final candidate also rejects changed provider/configuration labels during
continuation planning, before RPC work. Its regression was extended and a final `bun run check`
again passed all 300 tests plus type checking/lint/formatting. The immutable source snapshots
retain the code actually used for measurement; this later guard does not rewrite or repeat data.

### Research decision and closeout

The bounded baseline is complete. The supported economic finding is zero positive-gross results
among these 146 qualified samples of this workload. Coverage and timing gaps prevent a conclusion
about unsampled blocks or intra-block opportunities. Research recommendation: **revise the
observation/freshness approach before drawing broader negative-yield conclusions**. This selects
no follow-on implementation task and does not require another milestone for this task's completion.

Acceptance evidence is the implementation, 300-test local pass, controlled fault/accounting cases,
two actual prospectively bounded windows, canonical reconciliation, exact offline reproduction,
sanitized report and synchronized planning records. Diagnostic target failures remain explicit.
Real reorg injection, live forced disk/power failure, new-run native OS-signal stress and new research
behavior on other platforms were not separately exercised. Testing is not formal verification.
Full reproduction requires both local directories and their retained parent link/source proof;
the selected summary archive alone is not a complete raw dataset.

Disposition: **Done**. Implementation, research evidence and review corrections were delivered in
user-merged PR #5. The merge closeout below records the final candidate and hosted checks;
local research acceptance and diagnostic target misses remain documented here.
No next task starts automatically.

Final documentation verification: `git diff --check` passed; 236 local Markdown targets/anchors
across nine changed/new documents passed. Task independence, completed acceptance entries, archive
totals, raw journal/SQLite hashes and absence of producer owner markers were rechecked successfully.

### PR #5 review corrections

On 2026-11-20 the user instructed **“Good now fix them all”**, authorizing fixes and regression
coverage for the three findings in [PR #5's review](https://github.com/mikolajed/pooltrace/pull/5#pullrequestreview-5993109408).
This authorizes the bounded corrections, not a new commit, push, merge or live sampling run.
The user subsequently said **“You froze, you can commit”**, explicitly authorizing the prepared
review-fix commit, then **“Push to remote”**, authorizing its task-branch publication. The user
performed the merge recorded below. No additional live sampling was authorized or performed.

The runner now applies one fatal RPC classification to pipeline, observer and reconciliation
failures: authorization, configuration and unsupported reads. Reconciliation preserves the failed
canonical-read event before ending the experiment, so a fatal failure cannot arm another window.
Whole-experiment cancellation is checked after observer shutdown and during/following closing
reads, before counting the window as completed. It retains cancellation in the terminal result and
journal, including during window 2. Window-local limits and unavailable canonical state keep
their nonfatal behavior.

Ten constructed regressions use actual journaled send categories and the shared pipeline/store.
They cover closing authorization/unsupported/wrong-chain failures, both unsupported RPC codes in
collection and quotation, cancellation during each window's closing reads, and a nonfatal missing
header control. Checks include retained failure events, no subsequent dispatch/window after fatal
closing errors, terminal/window stop reasons, incomplete reports and released producer ownership.
Before the fix, nine cases failed and the nonfatal control passed. After the fix,
`bun run test -- apps/backend/test/research.test.ts` passed **28 tests** on Linux x64,
Node 26.3.1 and Bun 1.3.11. Full `bun run check` then passed **310 tests across 14 files**,
toolchain validation, type checking, lint and formatting. These commands used the environment's
retained Tini wrapper and subprocess/loopback permission for native process checks. `git diff --check`
and all 15 local Markdown targets/anchors in the two updated records passed.

The historical live archives remain unchanged. These checks are offline diagnostics; they do not
repeat or independently reproduce the historical market experiment. The corrections were
committed as `a96879ff205c4d09d6a13d9c24d460e554bae749`, published and validated as recorded below.

### Merge closeout

On 2026-11-20 the user reported the merge. GitHub readback confirms that
[PR #5](https://github.com/mikolajed/pooltrace/pull/5) merged final head
`a96879ff205c4d09d6a13d9c24d460e554bae749` into `main` at
`ad8cfc0b53e1fc598932f912a58c42d6bac7b243` (13:37:30 UTC). A fresh fetch independently
confirmed that merge commit on `origin/main`.

[CI run 44744634645](https://github.com/mikolajed/pooltrace/actions/runs/44744634645) passed all
six jobs for the final head: Linux/macOS full checks, web build, fixture browser smoke, workflow
validation and `pr-gate`. All three review threads were resolved before merge. These are the
delivered candidate's results; the earlier head's passing run is not substituted for them.

ARB-01 remains **Done**. The two-window findings, missed diagnostic targets, interruption/control
revision and unavailable cost/net evidence remain unchanged. Full historical reproduction still
requires the retained ignored raw datasets; it was not independently repeated in this environment.
This documentation-only closeout does not authorize or begin another implementation task.
