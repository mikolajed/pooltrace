# CONTRIB-01: Native Codex Cloud onboarding

- State: Closed — native direction and user-confirmed Cloud PR delivered; evidence limits below
- Milestone: Contributor onboarding
- Related records: [WORKFLOW](../WORKFLOW.md), [DEP-02](DEP-02-pr-verification-and-cloud-compatibility.md),
  [ADR-0009](../adr/0009-pr-verification-and-repository-trust.md)
- Requirement IDs: CR-09, CR-10
- Current scope: Codex first; other contributor tools later

## Closeout

Closed on 2026-11-19 following the user's instruction “we need close them”. The native onboarding
direction and contribution documentation were delivered in the user-merged
[PR #2](https://github.com/mikolajed/pooltrace/pull/2), head
`c1bcea12af539713ed93ce4f80b403190cfe9523`, base
`1d180c208829f3743f8c8d704e57cc485fe9520d`, merge commit
`d9136c3e7dbd57d05fcf992f4b9d68366e73598d`.
The [final review-ready CI run](https://github.com/mikolajed/pooltrace/actions/runs/44540774170)
succeeded for that head; the [PR review](https://github.com/mikolajed/pooltrace/pull/2#pullrequestreview-5977379339)
records all six jobs passing. Merge/head identities and all six successful jobs were read back during
closeout. The actual PR author is `mikolajed`; this is local delivery evidence.

Delivered: native Codex selected, custom app/publisher requirements withdrawn, setup instructions
documented, explicit commit permission/user review preserved, and a real user-confirmed Cloud PR.

Cloud delivery: on 2026-11-19 the user confirmed that
[PR #3](https://github.com/mikolajed/pooltrace/pull/3), “docs: plan arbitrage research across
milestones”, was created from a new branch in Codex Cloud and then merged. GitHub readback
independently confirms author `mikolajed`, branch `codex/arbitrage-research-roadmap`, head
`438e7dd6d26388fd2f6172c0d006fe50caa9b655`, base
`d9136c3e7dbd57d05fcf992f4b9d68366e73598d`, and merge commit
`244fa0b36d37170a2542c5fdf29cf5dc736cd045`.
The [final CI run, attempt 2](https://github.com/mikolajed/pooltrace/actions/runs/44563523648/attempts/2)
passed all six jobs for that head. Cloud origin is user-confirmed; the GitHub API does not supply
the Cloud execution log. This establishes the native Cloud branch/PR/check/user-merge path.

Remaining evidence limits: the Cloud environment's own setup/toolchain/check report was not
inspected or archived here, and a subsequent Cloud commit/update event was not separately tested.
The corresponding setup criterion remains unchecked; Cloud execution and PR creation are no
longer listed as missing. The user's unused app/key removal was not independently verified.

These are documented limits of the closed task, available for a future separately approved
verification scope. Closure does not activate standing delivery permissions or authorize account
changes, automatic dispatch, commits/publication, agent merging, or deployment.

Closeout documentation validation: `git diff --check` passed, and 242 local Markdown targets/
anchors across 15 changed documentation files resolved. No application suite, Cloud task or new
hosted run was executed for this documentation correction.

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
- [ ] The Cloud environment's setup/toolchain/check report is recorded. PR #3 demonstrates usable
  Cloud repository access/delivery, but the environment report was not inspected or archived here.
- [x] A real Cloud task produces a PR with recorded origin, author, head/base and required CI results.
  User-confirmed Cloud origin for PR #3; GitHub author/head/base/merge and six passing jobs read back.

Native Cloud delivery is demonstrated by PR #3 with the evidence limits above. The existing local
Codex branch/PR workflow is also usable; the documentation correction has been merged.

## Approval record

The user requested contributor setup on 2026-11-19 and selected “Codex first, other tools later”.
After reviewing the native Cloud capability, the user chose to remove the custom app themselves
and requested simplification of this record. This supersedes the custom-bot/publisher proposal.

The user subsequently authorized “Commit, push, and open the contributor-doc PR”. After discussing
the related scope, the cleanup was included in the existing workflow PR #2 rather than opening
another PR. This publication instruction does not authorize account changes, automatic task
dispatch, merge, deployment, or implementation of the product backlog. Later commits still require
explicit permission; the user performs review/merge.

On 2026-11-19 the user instructed “we need close them” for CONTRIB-01 and DEP-02 and requested
an AGENTS/workflow rule to prevent missed closeouts. This authorizes closing and reconciling the
records with the limits above; it does not establish that the unperformed Cloud checks passed.

The user subsequently clarified that a new branch and merged PR had already been created with
Codex Cloud, identifying PR #3. This supplies the Cloud-origin attestation recorded in closeout;
GitHub's corresponding PR/CI/merge evidence was then inspected.

## Evidence and handoff

- Native Cloud support was checked against the official guides. Environment inventory returned a
  runnable default environment but no dedicated Pooltrace environment at that earlier inspection;
  this local session launched no Cloud task. The later user-confirmed PR #3 supplies actual Cloud
  delivery evidence, as recorded in closeout.
- Local Codex delivery is independently demonstrated by [PR #2](https://github.com/mikolajed/pooltrace/pull/2),
  authored as `mikolajed` at head `db3e4621259e3b6314a57e09d1104dd346ffeacc`.
  [CI attempt 2](https://github.com/mikolajed/pooltrace/actions/runs/44519953125/attempts/2)
  passed all six jobs. Attempt 1 failed during Ubuntu package downloads before browser tests;
  that failure is preserved in the PR's validation notes.
- Local PR delivery is not evidence of Cloud execution. The initial workflow-only head's hosted
  passes do not cover later contributor-document changes. The combined candidate's fresh CI and
  subsequent user merge are recorded in [closeout](#closeout).
- No custom publisher or authentication helper was implemented, and no app private key was read
  or used. App/key deletion is the user's action and has not been independently verified.
