# Current state

Updated: 2026-11-19 (Europe/Warsaw).

## Phase and authorization

**M1-01 through M1-12 are complete. ADRs 0001–0009 are accepted; DEP-02 is in progress.**

The next requested priority is CI and a shared PR workflow before M2. On 2026-11-18 the user said
“i want to document this so we can set this up”, following discussion of multiple contributor tools
and bot-authored PRs. [ADR-0009](adr/0009-pr-verification-and-repository-trust.md),
[DEP-02](tasks/DEP-02-pr-verification-and-cloud-compatibility.md) and
[CONTRIB-01](tasks/CONTRIB-01-shared-pr-contributor-setup.md) document the intended setup. The user
subsequently said “i accept adr9 and dep2”, accepting the design and approving bounded DEP-02
implementation. On 2026-11-19 the user explicitly authorized committing/pushing `codex/dep-02-ci`,
opening a draft PR and running/fixing DEP-02 hosted checks, with “Do not merge.” CONTRIB-01,
standing delivery permissions, agent repository administration, merging and deployment remain unapproved.
The user subsequently created the main-branch ruleset, marked PR #1 ready and requested check fixes
and a readiness comment. Those scoped fixes and the comment are authorized; do not merge.

The user accepted ADR-0008 and approved both implementation scopes with “ok i think we can do it
now i accept ad8 and m1-11 and m1-12” on 2026-11-18. The completed
[M1-11 task](tasks/M1-11-local-api-sse-and-browser.md#implementation-evidence) and
[M1-12 task](tasks/M1-12-local-startup-readiness-and-shutdown.md#implementation-evidence) own
approval, actual validation and limitations. Earlier task records retain their own evidence.
[WORKFLOW.md](WORKFLOW.md) governs later work. On 2026-11-18 the user requested the completion
commit with “commit”; that checkpoint is complete. DEP-02 implementation and publication are now
approved; later implementation and deployment remain unapproved.

## What exists

- One local backend owns bounded RPC, immutable snapshots/analysis, all 36 route/size outcomes,
  canonicality/freshness checks, serial collection, exact SQLite evidence, read API and SSE.
- A minimal Next.js/React browser shows exact gross amounts, unavailable costs/net, provenance,
  save/connection/collector state, and bounded observation/analysis history. Current presentation
  expires conservatively; historical evidence never restores live admission.
- `bun run dev --mode fixture|live` starts both applications with identity-bearing readiness,
  isolated configuration and owned shutdown. Individual commands remain available. The foreground
  launcher/native SQLite are validated on macOS arm64 and Ubuntu 24.04 arm64. Windows is unsupported.
- The diagnostic live/fixture CLI uses the same backend modules and per-database producer guard.
  CLI and service cannot produce concurrently on the same evidence file. Both preserve independent
  calculation/save status and exact confirmed revision IDs.
- The pinned Bun/Node workspace passes **282 offline tests across 13 files**, type/lint/format
  checks, a credential-free clean frozen-lockfile installation/check, and the production web build.
- Actual fixture/live browser and API checks, native SIGINT/130 and SIGTERM/143 shutdown, competing
  CLI refusal, closed listeners, ownership release and historical reopen are recorded in the tasks.
  The archived live API event had 36 qualified saved outcomes at block 26444090; its best tested
  gross was negative and costs/net were unavailable. It is historical evidence now.
- The [analysis guide](ANALYSIS.md) explains implemented math, lifecycle interpretation and evidence.
  The [root README](../README.md#local-application) owns setup, commands and recovery boundaries.
  The supplied perched kingfisher reference remains unchanged.
- DEP-02's workflow, pinned Actions, fail-closed gate and regression tests, candidate metadata and
  Chromium fixture smoke passed local validation and the initial six-job hosted baseline on
  [draft PR #1](https://github.com/mikolajed/pooltrace/pull/1). Hosted Linux x64 and macOS arm64 each
  passed all 281 tests. The task records exact head/base/merge SHAs, images, native versions and
  sanitized artifacts separately from local evidence.
- Commit messages and PR titles use Conventional Commits. AGENTS links to WORKFLOW's naming
  guidance and commit-message template; GitHub's PR template covers scope, validation and limits.

## Remaining boundaries

Qualification belongs to each observation/input/policy. Reports and screenshots are as-of events,
not continuing live eligibility, profitability or capture claims. Collection does not depend on
browser refresh/navigation and HTTP/SSE requests do not invoke RPC.

No wallet, executor, transaction submission, fork simulation, full-transaction cost producer,
benchmark or hosted deployment exists. PR checks run on GitHub; the user enabled main-branch
protection. Stale-base integration and bot/human approval remain unverified. Executor/Anvil/cost evidence remains M2;
richer history/replay/recovery/backup remains M3. Provider fallback/gateway and additional chains
retain their separate backlog scopes. Other runner images/platforms, power loss, network filesystems, exhaustive
browser suspension/network stress and sustained freshness/performance remain unverified.

## Latest handoff and next proposed action

M1-11/M1-12 implementation and evidence are committed at `2e5a3fe`. DEP-02 is published on
`codex/dep-02-ci`. [Task evidence](tasks/DEP-02-pr-verification-and-cloud-compatibility.md#implementation-evidence)
records actual checks and the exact branch/PR/settings handoff. GitHub is public/personal;
`Protect main` is active and read back through the connector, which lacks protection administration.
No bot registration, agent settings change, merge or contributor-tool setup is authorized.

The connector's PR-write access now works. It opened draft PR #1 as authenticated author
`mikolajed`; this does not prove bot delivery or a distinct human-approval path. The initial
[hosted run](https://github.com/mikolajed/pooltrace/actions/runs/44422845638) passed all six checks.
The controlled failing test made `pr-gate` fail, and removing it produced a fresh six-job pass.
The user requested consolidation with a rebase; historical candidates remain in the evidence
archive. Rewritten heads require fresh checks; current results belong to the latest PR candidate.
The observed check source is `pr-gate` from GitHub Actions (app ID `15368`). The user marked the PR
ready for review; its next run exposed another analysis unit test's host-clock assumption. The
analysis suite now supplies explicit clock/timestamp inputs, with a regression forbidding fallback
to the host clock. All 282 tests pass locally; latest hosted results and the requested readiness
comment belong on the PR. Its failed gate was reported as merge-blocking under the saved ruleset.
The PR remains unmerged.

Review the latest checks and actual evidence before merging.
DEP-02 remains In progress until hosted/enforcement acceptance is demonstrated. Select the first two actual contributor tools and
authorize CONTRIB-01's identity/delivery setup against that CI. The combined
process remains incomplete until real PR triggers, human approval and enforcement are verified.
M2 executor design follows this priority and has not started.
