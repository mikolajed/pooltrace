# CONTRIB-01: Native Codex Cloud onboarding

- State: In progress — native Cloud setup and a real Cloud PR remain unverified
- Milestone: Contributor onboarding
- Related records: [WORKFLOW](../WORKFLOW.md), [DEP-02](DEP-02-pr-verification-and-cloud-compatibility.md),
  [ADR-0009](../adr/0009-pr-verification-and-repository-trust.md)
- Requirement IDs: CR-09, CR-10
- Current scope: Codex first; other contributor tools later

## Outcome

Use native Codex Cloud with the connected Pooltrace repository to prepare bounded changes, run
project checks, and open PRs through the existing CI. The user controls commit authorization,
review, and merge under WORKFLOW.

## Scope

- Connect `mikolajed/pooltrace` to a native Codex Cloud environment.
- Prepare the repository's pinned Node/Bun toolchain and verify its documented offline commands.
- Verify one real Cloud task's repository access, changes, actual PR author, and current CI results.
- Record actual setup and validation evidence here. Future tools follow the same repository rules
  and CI when selected; they are not prerequisites for this Codex increment.

Custom GitHub Apps, private keys, token brokers, a PR-publishing workflow, separate bot identities,
and a second contributor are not required for this native onboarding path. The earlier custom-app
and publisher proposal is withdrawn. The user handles removal of their unused app and key.

## Native setup

1. Open **Settings → Codex Cloud → Environments → Create environment**, select Pooltrace, and
   connect GitHub if prompted.
2. Prepare Node `26.3.1` and Bun `1.3.11`, matching the repository pins. Verify
   `bun install --frozen-lockfile`, `bun run check`, and `bun run build:web`. Ordinary setup uses
   offline/fixture data and needs no private RPC configuration.
3. Review the actual setup report and publish the environment. Start a bounded task using
   **Work in → Cloud** and the prepared environment.
4. Inspect its diff and check results. Commit/push/open a PR only within the user's explicit
   instruction. Verify actual PR authorship and required CI before requesting user review/merge.

Cloud execution does not prove a distinct bot author. Record the authenticated author honestly;
Git commit display names do not establish PR identity. GitHub-enforced approval by a separate
reviewer is a distinct capability to review if needed, not a prerequisite for ordinary native PRs.

Official guides checked on 2026-11-19:
[Codex Cloud](https://learn.chatgpt.com/docs/cloud) and
[Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments).

## Acceptance criteria

- [x] Native Codex Cloud is the selected onboarding path; custom app/publisher requirements removed.
- [x] Contributor behavior refers to the canonical workflow and preserves explicit commit permission
  and user review/merge.
- [ ] A Pooltrace Cloud environment is prepared/published with actual toolchain and check evidence.
- [ ] A real Cloud task produces a PR with recorded origin, author, head/base and required CI results.

Native Cloud validation remains future work. It does not block using the already working local
Codex branch/PR workflow or merging the documentation correction.

## Approval record

The user requested contributor setup on 2026-11-19 and selected “Codex first, other tools later”.
After reviewing the native Cloud capability, the user chose to remove the custom app themselves
and requested simplification of this record. This supersedes the custom-bot/publisher proposal.

The user subsequently authorized “Commit, push, and open the contributor-doc PR”. After discussing
the related scope, the cleanup is being included in the existing workflow PR #2 rather than opening
another PR. This publication instruction does not authorize account changes, automatic task
dispatch, merge, deployment, or implementation of the product backlog. Later commits still require
explicit permission; the user performs review/merge.

## Evidence and handoff

- Native Cloud support was checked against the official guides. Environment inventory returned a
  runnable default environment but no dedicated Pooltrace environment; no Cloud task was launched.
- Local Codex delivery is independently demonstrated by [PR #2](https://github.com/mikolajed/pooltrace/pull/2),
  authored as `mikolajed` at head `db3e4621259e3b6314a57e09d1104dd346ffeacc`.
  [CI attempt 2](https://github.com/mikolajed/pooltrace/actions/runs/44519953125/attempts/2)
  passed all six jobs. Attempt 1 failed during Ubuntu package downloads before browser tests;
  that failure is preserved in the PR's validation notes.
- Local PR delivery is not evidence of Cloud execution. The initial workflow-only head's hosted
  passes do not cover later contributor-document changes; the combined candidate requires fresh CI,
  whose actual result is recorded in PR #2 before review readiness.
- No custom publisher or authentication helper was implemented, and no app private key was read
  or used. App/key deletion is the user's action and has not been independently verified.
