# 0009: PR verification and repository trust boundaries

- Status: Accepted
- Proposed on: 2026-11-18
- Decision accepted by user: 2026-11-18
- Related task records: [DEP-02](../tasks/DEP-02-pr-verification-and-cloud-compatibility.md),
  [CONTRIB-01](../tasks/CONTRIB-01-shared-pr-contributor-setup.md)
- Requirement IDs: CR-01, CR-03, CR-06, CR-09, CR-10, CR-11
- Supersedes / superseded by: None; refines the future verification direction in ADR-0004

## Context

M1 is complete at `2e5a3fe`. The repository has pinned Node 26.3.1/Bun 1.3.11, a frozen lockfile,
262 locally passing offline tests, a production web build and actual local browser/process evidence.
At design preparation there was no GitHub Actions workflow or verified repository protection configuration. Local checks
do not establish that a hosted runner can install the native SQLite dependency or supervise apps.
The M1 launcher rejected non-macOS hosts; Linux support required validation in DEP-02.

The user wants PR verification prioritized before M2, with contributors using a common review
boundary. The contribution/authorization policy belongs in [WORKFLOW.md](../WORKFLOW.md#proposed-shared-pr-contributions).
This ADR concerns executable checks, authenticated actors, candidate identity and merge enforcement.
It does not choose hosting, create credentials, configure external accounts or approve setup.

## Decision

### 1. GitHub Actions for credential-free verification

Use GitHub Actions for the existing GitHub repository. Run checks for PR creation, new commits and
reopening, including draft PRs, and for pushes to `main`. A manual unprivileged run may aid diagnosis.
Use PR merge-result checkout for integration verification; record the head SHA, base SHA and tested
merge SHA so a result cannot be mistaken for another candidate. Cancel superseded PR runs with
PR-scoped concurrency; never cancel an unrelated PR or turn cancellation into success.

Use explicit tested runner-image labels, current repository runtime pins and
`bun install --frozen-lockfile`. Record the actual runner image/architecture, runtime, lockfile
digest and native driver/SQLite versions. Hosted images remain mutable; an explicit label is not
a claim of bit-identical infrastructure. Action references use reviewed full commit SHAs. Select
exact action/browser-tool versions and runner labels during implementation and record their sources.

### 2. Required check contract

Initial job names below are stable, repository-wide unique check identifiers. Run the
baseline on every PR initially; optimize path filtering only after demonstrating that required
checks cannot disappear or silently omit affected behavior.

| Check | Required behavior |
| --- | --- |
| `checks-linux` | Clean install and `bun run check` on a selected Linux runner, including native SQLite and meaningful process tests |
| `checks-macos` | Clean install and the same full check on a selected macOS runner, preserving current lifecycle coverage |
| `web-build` | Credential-free `bun run build:web`; record the exact candidate and lockfile identity |
| `fixture-smoke` | Automated Chromium browser/API check against real fixture apps: 36 exact rows, constructed labels, unavailable costs/net, historical views, refresh/reconnect, expiry/disconnect withdrawal, saved history after restart and owned cleanup |
| `workflow-check` | Validate workflow syntax and the declared gate/dependency contract using a reviewed pinned checker or equivalent meaningful verification |
| `pr-gate` | Run even after upstream failure; succeed only when every required job for this candidate reports success |

Playwright Test is the selected browser harness, with one Chromium project initially. Use the
repository's Bun package/command conventions. Browser and package pins must match. Keep the smoke
bounded and deterministic: isolated paths/ports, no private `.env`, no live RPC, readiness rather
than arbitrary sleeps, exact-value assertions and failure diagnostics. Controlled clock/network
faults must remain distinguishable from real elapsed/native-process evidence.

`pr-gate` must explicitly reject failure, cancellation, timeout, missing and unexpected skipped
jobs. GitHub's treatment of skipped jobs must not substitute for this policy. Do not use
`continue-on-error`, blanket retries, reduced coverage, changed financial deadlines or fixture
substitution to manufacture a pass. A diagnostic retry can collect evidence but cannot erase an
unexplained earlier failure. Existing test totals are a baseline, not a permanent numeric quota.

Linux support is part of DEP-02's bounded compatibility work: verify group ownership, descendants,
signals, escalation, native module installation and real app restart. Merely changing the platform
guard or skipping lifecycle tests does not establish support. Keep Windows unsupported. If Linux
cannot satisfy ADR-0008 without a material design change, report the gap for review.

### 3. Required merge enforcement

Verify repository owner type, visibility, account plan, available protection features and existing
rules before proposing settings changes. Require PRs, the verified `pr-gate`, current base-branch
integration and resolution of review findings on `main`; disable ordinary direct/force pushes and
deletion. Bind required checks to their expected integration where supported and verify the actual
check names after their first real run. Do not claim enforcement from workflow YAML alone.

Require the user's approval once a distinct PR-author identity is proven. Dismiss approvals when
reviewable changes arrive. Verify the intended human can approve the actual bot-authored PR and
that contributor credentials cannot bypass protection. Required approval cannot work when the
reviewer is also the authenticated PR author. Account/plan limitations are unresolved until checked;
do not silently weaken the policy, move the repository or purchase an upgrade.

Use up-to-date required checks initially. A merge queue is optional future adoption if the actual
repository is eligible and volume warrants it; add `merge_group` coverage before requiring one.
Keep merging human initiated under the workflow policy. Privileged settings are a distinct
reviewable handoff; apply only the settings expressly authorized in the task.

### 4. Separate verification from write credentials

PR code is untrusted regardless of its author. The checking workflow has read-only repository
permissions, no RPC/model-provider/deployment secrets and no persistent write credential in checkout.
Avoid executing PR code through privileged `pull_request_target` or `workflow_run` contexts.
Treat PR text, logs, artifacts and dependency scripts as untrusted input. Use isolated hosted
runners initially; introducing a persistent self-hosted runner requires another design review.

PR delivery uses separate scoped credentials; CI does not need them. Prefer a GitHub App
installation token for attributable, independently revocable automation. Restrict access to this
repository and required content/PR operations; exclude repository administration and protection
bypass. Token scope alone is insufficient to enforce branch and merge policy, which must be
tested with repository rules. Keep app private keys outside arbitrary code execution and provision
short-lived credentials through an approved tool connection or protected delivery path.

A PR author is the authenticated actor, independently of Git author metadata. Document the actual
identity and credential path for each enabled tool. Native integrations may act on behalf of a
user; do not assume an installed app automatically creates bot-authored PRs. The built-in
`GITHUB_TOKEN` has workflow-trigger restrictions/approval behavior; prove automatic checks for real
PR creation and updates through the chosen delivery mechanism. An absent run must block readiness.

### 5. Evidence and external validation

Retain bounded, sanitized check summaries and browser failure traces/screenshots as CI artifacts.
The initial proposal is seven-day retention, adjusted only within the approved cost/data policy.
Record the tested candidate, toolchain, runner, lockfile and check outcomes. Do not upload private
configuration, app keys, arbitrary environment dumps, full workspaces or runtime databases.
Dependency caches are disposable optimizations keyed by OS, runtime and lockfile; a clean uncached
installation must also pass. Cache hits are not verification evidence.

Live RPC and future fork/cost checks use separately authorized controlled workflows. Ordinary PR
verification remains offline/constructed. A successful fixture run supplies no live profitability,
execution or capture evidence. Staging, release packaging, promotion and deployment remain DEP-01
and DEP-03–05; browser dependencies/CI do not authorize production changes.

## Alternatives considered

| Alternative | Assessment |
| --- | --- |
| Local checks and PR summaries only | Useful feedback, but no independently executed merge gate |
| macOS-only CI | Matches M1's verified host; leaves Linux/cloud execution unresolved |
| Separate pipelines for different contributor tools | Duplicates policy and creates inconsistent acceptance; use the same checks for all PRs |
| Live RPC on every PR | Adds private access and external nondeterminism; keep explicit integration evidence separate |
| Required merge queue immediately | Eligibility is unverified; up-to-date checks establish the initial integration boundary |
| Automatic merge after green checks | Does not satisfy the requested human review/merge workflow |
| Custom contributor orchestration service | Extra credential/lifecycle complexity before ordinary branch/PR delivery is proven |

## Consequences

Reviewers receive reproducible build/test results and actual integration diagnostics for a named
candidate. Linux/native compatibility and browser automation require implementation; hosted CI and
macOS jobs consume account resources. Passing tests does not prove all requirements, security or
financial correctness. Workflow changes themselves require human review; a green run using a
weakened workflow is insufficient. The first setup must demonstrate both failure blocking and a
legitimate repair, not only a green baseline.

## Acceptance and validation criteria

DEP-02 owns clean runner installs, platform and browser integration, deliberate failure/cancel/skip
cases, stale-base detection and the actual required-check configuration. CONTRIB-01 owns real
contributor identities, delivery/update events, revocation and the human review path. Neither can
claim the combined workflow is enabled while an unverified dependency remains. Task matrices
describe planned checks; they are not results.

## Official references

Consulted on 2026-11-18. These establish platform behavior; the accepted choices are implemented
and verified through the related task records.

- [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): required checks, integration freshness, approval and plan constraints.
- [Workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): PR/merge-result and merge-group triggers.
- [Secure Actions use](https://docs.github.com/en/actions/reference/security/secure-use): minimum permissions, pinned actions and untrusted checkout risks.
- [GitHub App authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app): installation identity versus acting on behalf of a user.
- [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token): token-triggered workflow restrictions and PR approval behavior.
- [Required reviews](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews): authenticated authors cannot approve their own PRs.
- [Merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue): repository eligibility and `merge_group` checks.
- [Playwright CI](https://playwright.dev/docs/ci-intro): browser CI and trace/report inspection; adapt examples to project pins/Bun/security policy.

## Approval record

The user requested documentation with “i want to document this so we can set this up” on
2026-11-18, following discussion of multiple contributor tools, bot-authored PRs and CI before M2.
This authorized documentation preparation. The user subsequently said “i accept adr9 and dep2”
on 2026-11-18, accepting this design and approving DEP-02 implementation. CONTRIB-01 setup and
standing delivery permissions remain separately gated. Remote publication/settings actions need
the explicit scope recorded in DEP-02; no commit, push or PR publication was requested here.

## Implementation and evidence

DEP-02 implementation is in progress. Its task record owns actual checks and remaining external
validation. Documentation preparation introduced no implementation or remote settings. Bot/tool
setup remains CONTRIB-01 and is not authorized by DEP-02 approval.
