# Current state

Updated: 2026-11-19 (Europe/Warsaw).

## Phase and authorization

**M1-01 through M1-12 are complete. ADRs 0001–0009 are accepted. DEP-02 and CONTRIB-01 are
closed at the user's request, with outstanding validation recorded explicitly.**

The CI implementation was approved by “i accept adr9 and dep2” and delivered in user-merged
[PR #1](https://github.com/mikolajed/pooltrace/pull/1). The user selected native Codex onboarding
and merged its workflow/documentation correction in
[PR #2](https://github.com/mikolajed/pooltrace/pull/2). On 2026-11-19 the user instructed
“we need close them” and requested a rule preventing missed closeouts. The
[DEP-02 closeout](tasks/DEP-02-pr-verification-and-cloud-compatibility.md#closeout) and
[CONTRIB-01 closeout](tasks/CONTRIB-01-shared-pr-contributor-setup.md#closeout) distinguish merged
delivery from unperformed validation. They are Closed, not claims that every original check passed.

The local branch/PR workflow is usable. The user confirmed PR #3 was created in Codex Cloud;
GitHub readback verifies its author/head/base/merge and six passing jobs on final CI attempt 2.
The native Cloud delivery path is demonstrated; the environment's own setup report and a subsequent
Cloud commit/update event were not inspected/tested.
Standing delivery permissions remain inactive; explicit commit/publication permission and user
review/merge are still required under [WORKFLOW](WORKFLOW.md). Closing these records does not
authorize another implementation task, account/settings changes, agent merging, or deployment.

## What exists

- One local backend owns bounded RPC, immutable snapshots/analysis, all 36 route/size outcomes,
  canonicality/freshness checks, serial collection, exact SQLite evidence, read API and SSE.
- A minimal Next.js/React browser shows exact gross amounts, unavailable costs/net, provenance,
  save/connection/collector state, and bounded observation/analysis history. Historical evidence
  never restores live admission.
- `bun run dev --mode fixture|live` starts both applications with identity-bearing readiness,
  isolated configuration and owned shutdown. The foreground launcher/native SQLite are validated
  on macOS arm64 and Ubuntu 24.04 arm64. The diagnostic CLI shares backend behavior and exclusive
  per-database producer ownership. Windows remains unsupported.
- M1 task evidence records actual fixture/live browser/API checks, native signal shutdown,
  competing-producer refusal, closed listeners, ownership release and historical reopen. The
  archived live API event had 36 qualified saved outcomes at block 26444090; its best tested gross
  was negative and costs/net were unavailable. It is historical evidence.
- DEP-02 delivered pinned GitHub Actions, Linux/macOS full checks, production build, Chromium
  fixture smoke, candidate metadata and a fail-closed gate. The final PR #1 candidate passed all
  six jobs; each platform passed 282 tests across 13 files. The user enabled the protected-main
  ruleset; a failed current gate was reported as merge-blocking.
- PR #2 delivered branch-first contribution rules, explicit commit/publication permissions and
  native onboarding documentation. Its final review-ready CI run succeeded for the merged head.
- PR #3 supplied user-confirmed Cloud branch/PR delivery and user merge. Its final CI attempt
  passed all six jobs for head `438e7dd6d26388fd2f6172c0d006fe50caa9b655`; CONTRIB-01 records
  the Cloud-origin attestation and independently verified GitHub evidence.
- The [analysis guide](ANALYSIS.md) explains implemented math, interpretation and evidence.
  The [root README](../README.md#local-application) owns setup/commands. The supplied perched
  kingfisher reference remains unchanged.

## Remaining boundaries

Qualification belongs to each observation/input/policy. Reports and screenshots are as-of events,
not continuing eligibility, profitability or capture claims. Browser/API requests do not invoke RPC.

No wallet, executor, transaction submission, fork simulation, full-transaction cost producer,
benchmark or hosted deployment exists. DEP-02's controlled stale-base/review-invalidation experiment,
the Cloud environment's own setup report and a subsequent Cloud commit/update event remain
unverified in the closed records. Native Cloud execution/PR delivery is user-confirmed via PR #3. The custom
app/publisher proposal was withdrawn; no distinct bot-author approval path is claimed. The user
handles removal of their unused app/key; removal has not been independently verified.

Executor/Anvil/cost evidence remains M2; richer history/replay/recovery/backup remains M3.
Provider fallback/gateway and additional chains retain separate scopes. Other runner images,
power loss, network filesystems, exhaustive browser/network stress and sustained freshness or
performance remain unverified.

## Latest handoff and next proposed action

PR #1 merged as `1d180c208829f3743f8c8d704e57cc485fe9520d`; PR #2 merged as
`d9136c3e7dbd57d05fcf992f4b9d68366e73598d`. Their task closeouts retain final head/base/run
references and outstanding criteria. [PR #3](https://github.com/mikolajed/pooltrace/pull/3)
merged the arbitrage research roadmap as `244fa0b36d37170a2542c5fdf29cf5dc736cd045`.

The next proposed product task is to scope ARB-01: baseline route yield and collector freshness
over predefined block windows, using the completed M1 collector. The results inform M2 scope;
M2 fork and cost capabilities later support full-cost validation.
[Arbitrage research track](ROADMAP.md#arb--arbitrage-research-track).
ARB-01 execution and M2 design/implementation remain unapproved. No new product scope starts
automatically; setup verification is retained as a limit of the closed records rather than an
active task assignment.
