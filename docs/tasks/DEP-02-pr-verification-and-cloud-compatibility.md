# DEP-02: PR verification and cloud compatibility

- State: Closed — merged CI delivery; outstanding validation disclosed below
- Milestone: Delivery infrastructure, prioritized before M2
- Related ADRs: [Accepted ADR-0009](../adr/0009-pr-verification-and-repository-trust.md), accepted
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md) and
  [ADR-0008](../adr/0008-local-api-sse-and-process-interface.md)
- Requirement IDs: CR-01, CR-03, CR-06, CR-09, CR-10, CR-11
- Depends on: Completed M1; accepted ADR-0009 and recorded implementation/publication approval.

## Closeout

Closed on 2026-11-19 following the user's instruction “we need close them”. CI delivery was
accepted through the user's merge of [PR #1](https://github.com/mikolajed/pooltrace/pull/1),
head `991420de32dd975934f8e7ee9ab97f599cf99f41`, base
`2e5a3fe91797fb12d8801dc2d03014a0b6dc9388`, merge commit
`1d180c208829f3743f8c8d704e57cc485fe9520d`.
The [final candidate run](https://github.com/mikolajed/pooltrace/actions/runs/44431080875)
passed all six jobs. The [readiness comment](https://github.com/mikolajed/pooltrace/pull/1#issuecomment-6996206066)
records 282 tests on each platform and tested merge `793451ab8b1f56d11f8f9d012b7489c534e1271f`.
Merge/head identities and the six successful jobs were read back during closeout.

Delivered: Linux/macOS checks, production build, fixture browser/native-process smoke, the
fail-closed gate, candidate evidence, and the user-configured protected-main workflow. Actual
failed-gate blocking and repair are recorded below; the remaining unchecked criteria are not
reported as passed.

Outstanding and superseded items:

- CI05's controlled stale-base rejection/combined-base experiment and review-invalidation proof
  remain unverified. Strict current-base protection was read back; that is not the experiment.
- Native Cloud PR creation/check/user-merge is demonstrated by user-confirmed PR #3 with six
  passing jobs. The environment's own setup report and a subsequent Cloud commit/update event
  were not inspected/tested; [CONTRIB-01's closeout](CONTRIB-01-shared-pr-contributor-setup.md#closeout)
  records the exact provenance and remaining limits.
- The custom app/publisher and mandatory distinct-bot onboarding proposal was withdrawn when the
  user chose native Codex. A distinct-author approval path was not provisioned or proven.

These items remain documented limits of the closed task. Further verification requires its own
approved scope. Closure does not claim complete contribution-path validation, enable standing
delivery permissions, or authorize account changes, agent merging, or deployment.

Closeout documentation validation: `git diff --check` passed, and 242 local Markdown targets/
anchors across 15 changed documentation files resolved. No application suite or new hosted run
was executed for this documentation correction; the hosted evidence above belongs to the merged
candidates.

## Outcome

A PR is eligible for human review only after hosted checks verify its exact current candidate.
The user can review behavior and evidence with mechanical installation, type, test, build and
fixture-integration failures already reported. Required merge checks preserve that boundary as
`main` changes. CI applies uniformly to all contributors.

## Scope

- Add the GitHub Actions workflow implementing ADR-0009's stable required jobs, explicit runtime
  setup, frozen installs, concurrency, timeouts, minimal permissions and all-required-success gate.
- Verify native SQLite installation and meaningful existing checks on selected Linux/macOS runner
  images. Extend launcher support to Linux only after equivalent process-group/signal/cleanup
  behavior is demonstrated; retain macOS coverage and existing financial/storage policies.
- Add the bounded credential-free Playwright/Chromium fixture smoke, exact package/browser pins,
  Bun commands, deterministic fixtures and sanitized failure artifacts. Exercise the actual app
  entrypoints, API/browser/history, current-state withdrawal and shutdown/restart.
- Validate workflow configuration and the aggregate gate, including deliberately failed, missing,
  skipped and cancelled dependencies. Changes to test expectations must explain the requirement
  they preserve; do not disable coverage to make a runner green.
- Record commit/head/base/merge SHAs, lockfile/runtime/runner/native metadata and check outcomes.
  Produce short-lived CI diagnostics, not a production release artifact or hosted preview.
- Inspect actual GitHub repository/account capabilities and prepare the exact required-check and
  branch-protection settings. Configure/read back those settings within the user's explicit
  remote-action authorization; do not claim enforcement from a local workflow file.
- Demonstrate failure blocking, repair, new-commit reruns and current-base integration using an
  isolated test PR once its publication is authorized. The original bot-delivery integration
  premise was superseded by native onboarding; its unverified events are recorded in closeout.
- Update setup/contribution guidance, actual evidence, backlog and status. Preserve M1's as-of
  reports and distinguish new CI evidence from historical local validation.

## Outside scope

Hosting, containers, staging, production promotion, automated merges, model-provider accounts or
billing, a custom task dispatcher, persistent self-hosted runners, new chains/providers, live PR
RPC/fork execution, Anvil/executor/cost features, financial/time-limit changes, Windows support and
storage schema redesign. Bot/tool onboarding is CONTRIB-01. DEP-01 and DEP-03–05 retain deployment
scopes; this task does not require choosing hosting first.

## Decisions and open questions

ADR-0009 selects GitHub Actions, required check identities, Playwright/Chromium, Linux/macOS
coverage and the credential boundary. Exact verified action SHAs, runner labels, browser package
version and workflow checker are implementation selections researched against official sources.
The existing Node/Bun pins remain unless a separately reviewed compatibility issue requires change.

Initial inspection confirmed a public, personally owned repository with unprotected `main` and no rulesets.
The user subsequently enabled the main-branch ruleset; actual readback is recorded below.
The initial hosted run succeeded; plan/billing limits were not changed or exhaustively verified.
Record available features and actual costs/limits before provisioning; do not assume merge-queue
eligibility or purchase upgrades. An unavailable protection feature remains an explicit setup gap.

The task's implementation approval must state the permitted PR publication and repository-settings
actions. Where those are not already authorized, finish the reviewable workflow/settings proposal
before requesting the missing authorization. Do not request it again for actions already covered.
Required GitHub approval depends on the real authenticated PR author. Native onboarding does not
require a distinct bot author; any future distinct-author approval path needs its own actual proof
without making Linux/local verification depend on a model-provider subscription.

## Acceptance criteria

- [x] ADR-0009 accepted and bounded implementation authorized; no remote actions performed without authorization.
- [x] Clean uncached frozen installs and full checks pass on verified Linux/macOS hosts; native
  SQLite and actual launcher descendants/signals/restart are exercised without platform-test skips.
- [x] Production web build and real fixture browser/API smoke pass without private configuration,
  live network data or changed freshness/canonicality policies.
- [x] A deliberately broken candidate is blocked; failure, cancellation, skip and missing checks
  cannot yield a successful `pr-gate`; a repair/new commit creates fresh verifiable results.
- [x] Actual main-branch protection references the expected check source/name and current-base
  policy; unsupported account features and enforcement gaps are disclosed.
- [ ] CI05's controlled stale-base/combined-base experiment and review-invalidation proof.
  Unverified at closure; protection configuration alone is not this validation.
- [x] Selected runner/action/browser/dependency inputs, tested candidate and sanitized artifacts
  are recorded; write/RPC/model/deployment secrets are absent from PR verification.
- [x] The user reviewed/merged the workflow changes in PR #1; no automatic merge or deployment.
- [x] Native Cloud PR creation triggers the required gate and the user can merge: PR #3 has
  user-confirmed Cloud origin and GitHub-verified author, candidate, six passing jobs and merge.
- [ ] A subsequent Cloud commit/update event is separately verified. Unverified at closure;
  the former mandatory distinct-bot setup premise was superseded by native onboarding.
- [x] Task/status/backlog evidence distinguishes local checks, hosted runs and repository settings.

## Planned validation

| Case | Required evidence |
| --- | --- |
| CI01 — baseline | Exact committed candidate, cold frozen install, full checks and build on real selected runners; actual native versions and sanitized logs |
| CI02 — process compatibility | Linux/macOS success and failure paths: startup, readiness, CLI exclusion, SIGINT/130, SIGTERM/143, ignored stop/descendants, occupied port, unrelated sentinel survival, marker release and restart/history |
| CI03 — browser integration | Real fixture apps; 36 rows/exact units, unavailable costs/net, constructed labels, observation/analysis history, refresh/reconnect, expiry/disconnect withdrawal, restart/historical distinction and owned cleanup |
| CI04 — fail-closed gate | Introduce an isolated intentional type/test/build/smoke fault and exercise failed/cancelled/skipped/missing dependencies; demonstrate blocked merge and an actual repair |
| CI05 — integration freshness | Two independently passing isolated changes, base update, stale result rejected and latest combined candidate rechecked; new commits require renewed review/checks |
| CI06 — trust and artifacts | PR-context permissions, checkout credential behavior, no private environment, reviewed action SHAs, bounded artifact retention/content and no privileged checkout |
| CI07 — repository enforcement | Actual account capabilities/settings readback, expected required check source/name, direct/force-push and bypass limits using safe isolated proof; no destructive test on main |
| CI08 — contribution integration | Real approved delivery identity creates/updates a draft PR, checks run without a missing automation event, user-review path works; performed with CONTRIB-01 |

These are planned checks, not successful outcomes. External access failures remain unverified until
rerun successfully; local fixture processes cannot substitute for real hosted runner evidence.

## Approval record

- Documentation preparation: Approved on 2026-11-18 by “i want to document this so we can set this up”.
  Prior discussion establishes the requested direction: CI before M2, contributions from multiple
  tools and human PR review/merge.
- Design acceptance: Granted on 2026-11-18; see ADR-0009.
- Implementation approval: Granted on 2026-11-18 by “i accept adr9 and dep2”. This covers the
  bounded CI/platform/browser implementation and required checks; CONTRIB-01 remains unapproved.
- Publication and hosted-check iteration: Approved on 2026-11-19 by “Commit on `codex/dep-02-ci`,
  push it, and open the draft PR. Run and fix the DEP-02 hosted checks. Do not merge.”
  This authorizes the task branch, commits/pushes, draft PR and scoped CI fixes. Merging,
  repository administration, paid resources and CONTRIB-01 remain unapproved.
- Contribution naming documentation: Requested on 2026-11-19 with “shouldnt we add those rules
  about commits to agents md? and maybe even a temple in docs”. The short AGENTS rule links to
  WORKFLOW's commit/PR naming convention and commit-message template, plus GitHub's PR template.
  This adds guidance, not a new CI check or standing delivery permission.
- History cleanup: Requested on 2026-11-19 with “then cleanup the commit history with rebase”.
  Consolidate the task's commits on its draft branch and update the remote with a lease; retain
  actual hosted probe/repair evidence without the temporary commits in the final review history.
- Ready-for-review follow-up: On 2026-11-19 the user reported creating the ruleset and marking
  PR #1 ready, requested a readiness comment, and then said “it is failing checks fix it”. This
  authorizes the scoped test/CI repair and PR comment. The user performed the administration;
  no agent settings change, merge or CONTRIB-01 setup is authorized.
- Closeout correction: On 2026-11-19 the user instructed “we need close them” for DEP-02 and
  CONTRIB-01 and requested an AGENTS/workflow rule to prevent missed closeouts. This authorizes
  the documentation reconciliation; it does not claim unperformed validation or authorize a
  new implementation, commit, publication, settings change, or agent merge.

## Preparation evidence and handoff

Read-only inspection on 2026-11-18 confirmed baseline `2e5a3fe`, Node/Bun pins, existing scripts,
the macOS-only launcher guard and absence of repository workflow files. M1's 262-test/clean-build
results are historical baseline evidence, not Linux or hosted-CI results. Official sources are
recorded in ADR-0009. `git diff --check` passed, and an inline local Markdown checker verified
164 targets/anchors across 11 changed/new documents. Scope/state review confirmed both setup tasks
and ADR-0009 remain Proposed, current delivery restrictions remain active, and CI precedes M2.
No application suite, build, hosted runner, browser or account/permission test ran for this
documentation-only work.

No workflow YAML, implementation, tests, manifests, dependency installation, app/bot registration,
secrets, repository settings, PR, commit or push was created by this documentation preparation.
The user subsequently accepted ADR-0009 and approved this implementation scope as recorded above.

## Implementation evidence

Local candidate completed and validated on 2026-11-18–19 Europe/Warsaw. The evidence below records
the implementation, hosted iterations and user-configured enforcement chronologically. The
[closeout](#closeout) records the merged result and remaining validation limits. No hosted result
is claimed from local tests; no agent repository-setting change or merge was authorized.

### Delivered candidate

- `.github/workflows/ci.yml`: exact named Linux/macOS checks, web build, fixture smoke, workflow
  validation and always-run all-required-success gate. Draft/update/reopen/main events, PR-scoped
  cancellation, bounded jobs, read-only permissions, no persisted checkout credentials, no private
  secrets, and allowlisted sanitized artifacts with seven-day retention. No dependency cache is
  restored; each hosted job requests a frozen install.
- `scripts/ci`: YAML/security contract, native/candidate metadata, pinned checksum-verified
  actionlint and the gate entrypoint. Nineteen meaningful regression cases cover failed/missing/
  cancelled/skipped dependencies and weakened workflow mutations. Candidate metadata rejects an
  unexpected/dirty checkout in hosted CI and labels local uncommitted validation honestly.
- `scripts/browser` / `playwright.config.ts`: one real Chromium fixture workflow with all 36 rows
  checked using an independent string-based unit/decimal oracle, both history views, refresh,
  service suspension/withdrawal, native Bun SIGINT/130 and SIGTERM/143, ownership/listener cleanup
  and restart/historical reads. Real source is copied without private config and installed frozen
  in a temporary directory. One worker, no retries; no actual RPC or cost evidence.
- Linux POSIX launcher support. The native storage lock fixture now retains its SQLite connection
  and explicitly exercises GC, preserving the intended real writer lock until its owned process
  is killed. No timeout, financial, storage driver or schema policy was changed.
- Exact dev dependencies `@playwright/test` 1.65.1 and `yaml` 2.9.1; Chromium 1255 / Chrome for Testing
  159.0.8154.6. Existing dependency/runtime pins and install-script trust are unchanged. Commands,
  output ignores, types, engineering/setup/status guidance and evidence are updated.

Selected official release commits (resolved through GitHub tag APIs and action inputs inspected):

| Action | Release | Commit |
| --- | --- | --- |
| [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) | 7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0) | 7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| [setup-bun](https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0) | 2.2.0 | `0c5077e51419868618aeaa5fe8019c62421857d6` |
| [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | 7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

[Actionlint 1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12) asset checksums come from
the official release API and are fixed in the downloader. Both macOS arm64 and Linux arm64
downloads passed SHA-256 verification and executed successfully. The Linux x64 binary also passed
checksum verification and actionlint in the initial hosted workflow-check job. Package metadata/engines and the
[Playwright CI guide](https://playwright.dev/docs/ci) were consulted on 2026-11-18. Pins and successful
local checks are not an independent audit of third-party implementation.

### Actual validation

The [local validation archive](../evidence/DEP-02-local-validation-2026-11-18.json) retains matching
implementation digest `385cb710f9292bcff9b4c2ea1c5e91912a65e0a7747a9492f4fa4195a216b43d`, metadata,
lockfile hash, actual gate CLI exits, native versions and repository inspection. Its filename uses
the UTC evidence date. Baseline is `2e5a3fe` plus the uncommitted approved candidate; the digest's
input set excludes generated/dependency output and documentation.

| Case | Executed result and remaining boundary |
| --- | --- |
| CI01 | Local macOS arm64 and clean Ubuntu 24.04 arm64 VM: frozen installs, 281 tests / 13 files, checks and production builds passed. Hosted baseline also passed cold frozen installs and all 281 tests on `ubuntu-24.04` x64 and `macos-15` arm64, plus the Linux production build. Exact candidate/native/image metadata is archived below. |
| CI02 | All existing 33 launcher/config cases passed on both hosts with no platform skips, including sibling failures, identity/readiness, signals, occupied-port sentinel and ignored-stop descendants. Real browser smoke separately verified actual Bun/app SIGINT and SIGTERM shutdown, marker release, closed listeners and restart/history on both hosts. |
| CI03 | Final local Chromium smoke passed on macOS (13.7 s) and Ubuntu (10.5 s); hosted Ubuntu x64 baseline passed (17.1 s, no retries/skips/flakes). All verify exact values/units across 36 rows, constructed labels, unavailable costs/net, both history views, refresh, native suspension, conservative withdrawal and restart/historical reads. These are fixture diagnostics. |
| CI04 | Nineteen gate/workflow regressions passed. Actual gate CLI exits: complete success 0; malformed/missing/failure/cancelled/skipped 1. Hosted probe `80e06f8` failed the isolated assertion on both platforms (all existing 281 tests passed); the other three jobs passed and `pr-gate` exited 1. Repair `af8a61b` removes the probe and restores the exact passing implementation. Later, the protected non-draft PR was reported blocked with a failed gate; final repair `991420d` passed all six jobs. Detailed runs and settings readback are recorded below. |
| CI05 | Current-candidate metadata verifies exact head/base/tested-merge SHAs and clean checkout. A new probe commit triggered a fresh hosted run. Actual stale-base rejection, combined-base integration and review invalidation remain unverified. |
| CI06 | Pinned actionlint and workflow policy pass locally and on hosted Ubuntu x64. Hosted logs/metadata inspected, all five diagnostics artifacts uploaded with seven-day expiry. Browser artifact ZIP checksum, actual paths and report/lifecycle attachment inspected; no private configuration or database uploaded. Main protection was subsequently enabled by the user. |
| CI07 | Initially unprotected. User-created ruleset `27598219` now reads back active on the default branch, strict `pr-gate` bound to GitHub Actions app `15368`, required PRs/resolved threads, deletion/force-push restrictions and no bypass actors. `main` reports `protected: true`; the non-draft PR reports `mergeable_state: blocked` with the latest gate failed. No direct/force write or deletion on main was attempted; stale-base integration and bot approval remain unverified. |
| CI08 | Local delivery/checks are demonstrated by PRs #1–2. The user confirmed PR #3 originated in Codex Cloud; GitHub readback verifies author/head/base/merge and all six jobs passing on final run attempt 2. Subsequent Cloud commit/update events were not separately tested. The custom-app/distinct-bot proposal was withdrawn; no separate bot-author approval path is claimed. See CONTRIB-01 closeout. |

Initial failures were repaired before the passes above: a YAML `if: false` property bypassed a
truthiness-based policy test; the checker now rejects any conditional property on required jobs.
The first isolated browser snapshot lacked workspace dependency links, and symlinks then failed
Next readiness; the harness now performs a real frozen install. The first Linux lock test released
its native connection under GC; retaining it and explicitly forcing GC proved the correction on
both hosts. An old Next dev HMR session interrupted explicit post-restart navigation; the smoke
now leaves the stopped page before opening the restarted app. No production eligibility policy
was widened, and these failed attempts are not counted as successful checks.

Sandbox-denied loopback/network/cache/VM operations were rerun with the required execution
permission. An isolated temporary Ubuntu VM was used because the existing Docker daemon was
stopped; the user's existing Lima VM was not changed. Required checks were not skipped to hide a
platform failure. Final type/lint/format/document checks are recorded at handoff below.

Final static checks passed: type checking including the browser spec, lint and formatting across
88 files, `git diff --check`, and 227 local Markdown targets/anchors across 13 changed documents.
The temporary Ubuntu VM was stopped after evidence collection; its separate working files remain
available for any authorized follow-up. All browser harness app instances stopped through their
owned cleanup paths. The user's existing VM was not started or modified.

### Publication and settings handoff

Publication progress on 2026-11-19: commit `5237c41ddbeeaecd3eaabb552d6ade29a9d2abf7`
was created on `codex/dep-02-ci` and pushed to origin. The GitHub connector initially returned
HTTP 403 for PR creation; after access was restored, the user's “try now” retry opened
[draft PR #1](https://github.com/mikolajed/pooltrace/pull/1). Its title is
`ci: add required checks and fixture browser verification`, following the requested naming guidance.
The authenticated author is `mikolajed`, not a bot. The PR was initially draft; its subsequent user
merge is recorded in the closeout. Publication does not prove a distinct bot-author/human-approval path.

The [initial hosted run](https://github.com/mikolajed/pooltrace/actions/runs/44422845638) passed all
six jobs on the first attempt. It tested head `5237c41`, base `2e5a3fe` and actual merge checkout
`309931b9d1bd662592c95bce0bdbf16bdf21a22e`, with a clean workspace and the same implementation
digest as the local archive. Both platform jobs passed 281 tests in 13 files. The production build,
Chromium smoke (17.1 s, no retries), workflow policy/checksum-verified Linux x64 actionlint and
aggregate gate passed. All five diagnostic artifacts uploaded with seven-day expiry. The browser
artifact's ZIP SHA-256, actual paths, report and lifecycle attachment were inspected: constructed
data, SIGINT/130, SIGTERM/143 and historical reopen; no database or private configuration.

The check-run API identifies `pr-gate` as produced by **GitHub Actions**, app ID **15368**, slug
`github-actions`. This supplies the actual source for the proposed settings below; it does not
activate protection. Selected sanitized evidence is in the
[hosted validation archive](../evidence/DEP-02-hosted-validation-2026-11-19.json).

CI04's temporary isolated failing test was published as `80e06f8`; it changed no application
behavior or workflow policy. Its [hosted run](https://github.com/mikolajed/pooltrace/actions/runs/44423461946)
failed exactly that one assertion on both platforms while all existing 281 tests passed. The other
three jobs passed, and `pr-gate` ran despite the failures and exited 1. OS dependency download in
the browser job took 6 min 53 s; the browser test itself passed in 15.1 s. No diagnostic rerun or
weakened assertion was used to obtain a pass.

Repair `af8a61b` deletes only that temporary test. A diff against `5237c41` confirms identical
application, test, workflow, manifest and lockfile contents. Nineteen gate/workflow regressions and
the actual workflow checker passed again locally before publication. Its fresh
[hosted run](https://github.com/mikolajed/pooltrace/actions/runs/44424968096) passed all six jobs,
completing the controlled failure/repair proof. The user then requested a rebase to consolidate
the task's review history. The archive preserves these actual pre-rebase SHAs/results; rewriting
the branch creates a new candidate requiring fresh checks. Inspect the latest PR checks before review.
Failure of `pr-gate` demonstrated the aggregate check's behavior; GitHub merge blocking was not
yet verified at that point because `main` was unprotected.

The first rebased candidate `691975c` exposed a formatting error in the newly added hosted JSON
archive: both platform jobs rejected one array's layout before running tests. The archive was
formatted with the repository's Biome formatter and the single commit amended. Application,
workflow and test content did not change. This run is not counted as a successful check; latest
candidate results must be inspected on the PR.

Candidate `1a8c98f` passed Linux checks/build/workflow validation, but the hosted macOS job exposed
an existing historical-provenance test's healthy-clock assumption: 280 tests passed and one expected
`historical` but received `unavailable`. The unit test had sampled real wall/monotonic clocks across
collection and two analyses. The clock-safety path can conservatively produce `unavailable`; the
runner's exact clock samples were not recorded, so host timing is an inference, not a measured
clock event. The provenance test now supplies a coherent constructed clock and block timestamp
through collection, analysis and eligibility. It retains all attempt/reuse assertions, explicitly
checks historical origin and proves a diverged clock still withdraws freshness. Production clock,
deadline and eligibility policies are unchanged. The 49 analysis/snapshot tests, formatting and
full local checks (281 tests / 13 files, types/lint/format) passed after this correction; the latest
hosted candidate still requires its own pass.

On 2026-11-19 the user created [Protect main](https://github.com/mikolajed/pooltrace/rules/27598219)
and marked PR #1 ready. The connector read back active enforcement, default-branch targeting,
no exclusions or bypass actors, required PRs/resolved conversations, zero approvals, deletion and
force-push restrictions, and strict `pr-gate` bound to GitHub Actions app `15368`. `main` reports
`protected: true`. The connector can read the public ruleset but still has no administration grant.

The ready-for-review [run 7](https://github.com/mikolajed/pooltrace/actions/runs/44429913415) tested
the same `641f29d` candidate and failed the periodic-validation/concurrency analysis unit test on
macOS (280 passed, one failed). The source collection still used the host clock before switching
to a controlled analysis clock. A clock mismatch can conservatively invalidate that source; exact
runner clock samples were not recorded. The earlier single-case fix did not cover this setup.
All other jobs passed, `pr-gate` failed, and GitHub reported this current, non-draft PR as blocked.
No merge attempt or bypass was used.

The analysis unit suite now supplies coherent clock/timestamp inputs throughout collection,
analysis, revalidation and eligibility. Controlled tests still advance beyond the policy's
validation/deadline limits; expiry, cancellation, invalidation, exact arithmetic, attempt isolation
and diverged-clock assertions are preserved. A new regression makes the default host clock throw
and verifies that constructed collection/analysis never reads it. All 17 analysis tests and the full
282-test / 13-file local check (types/lint/format included) passed. Production clock, timing,
financial and admission policies are unchanged. The current candidate requires fresh hosted checks;
the requested PR comment records the final readiness result without authorizing a merge.

These are the saved settings, read back after the user's action. Further administration still
requires the user's authorization.

| Setting | Verified value / remaining boundary |
| --- | --- |
| Target | `main`; require pull requests |
| Required status check | `pr-gate`, strict up-to-date mode; bound to GitHub Actions app `15368` |
| Review conversations | Require resolution |
| Direct/force writes and deletion | Disable ordinary direct/force pushes and deletion; no contributor bypass; include administrators where supported |
| Approving review | Zero at readback. Human review/merge stays with the user. A GitHub-enforced distinct-author approval path remains unverified and is not a native onboarding prerequisite; the user cannot approve their own authenticated PR. |
| Merge mechanism | User-initiated merge; no auto-merge. Merge queue is not available to this personal repository under the currently documented eligibility. |

The original full validation plan included stale-base integration and contributor-path proof.
The task is Closed at the user's request with those limits retained in [closeout](#closeout),
rather than marked Done with all validation complete. No provider plan, account purchase,
protection rule, agent merge or production change is authorized by publication or closure.
