# Development workflow

## Authorization

Implementation requires explicit user approval for a named task, milestone, or otherwise clearly
bounded change. Current authorizations and evidence are maintained in the relevant task records;
[STATUS.md](STATUS.md) summarizes the active phase.

The product brief is future scope. Backlog entries, roadmap dates, proposed or accepted ADRs, and
an agent's plan do not authorize implementation. Silence is not approval. Do not create application
code, implementation scaffolding, tests, contracts, UI, package manifests, or install dependencies
during setup.

Design acceptance and implementation approval are separate. The user may approve both in one
message; record that without asking again. Within an approved scope, make routine implementation
choices independently. Return to the user only when a material design or scope change needs a
decision. Completing a task does not authorize starting the next one.

Requested documentation changes and read-only inspection can proceed within their stated scope.
Only the user creates commits. Agents may prepare changes and suggest commit messages, but must
not commit. Do not push unless the user explicitly asks. Never label agent-written decisions as
user approvals.

Future production changes follow the draft gates in [DEPLOYMENT.md](DEPLOYMENT.md). A successful
build, test run, staging validation, or accepted architecture does not grant release authorization.
CI/CD configuration and each production change need their explicitly approved scope.

## Commit messages and PR titles

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages and
PR titles:

```text
type(scope): concise imperative summary
```

The scope is optional. Use a lowercase type: `feat` for new behavior, `fix` for a bug,
`docs` for documentation, `test` for test coverage, `ci` for CI workflows, `build` for build
tooling/dependencies, `refactor` for restructuring, `perf` for performance, `style` for formatting,
`chore` for other maintenance, or `revert` for a reversal. Choose the type that describes the final change.
Use `!` or a `BREAKING CHANGE:` footer only for an actual incompatible change; explain its impact
and migration. Do not add a scope merely to repeat the type or task ID.

For example: `ci: add required checks and fixture browser verification`. A PR title describes the combined
result; individual commits describe their own changes. Keep the title suitable for a squash-merge
commit message. Naming does not select a merge method or grant permission to commit or merge.

Commit-message template (omit optional fields and the body when they add no useful information):

```text
type(scope): concise imperative summary

Explain the problem and resulting behavior when the subject is insufficient.
Record relevant validation and material limitations.

Task: DEP-02
```

Replace the example task ID with the actual task. Use the
[PR template](pull_request_template.md) for the approved scope, behavior, validation and
remaining limitations. Replace its prompts with actual evidence; do not report planned checks as
passed. GitHub [loads this template from the default branch](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository),
so automatic inclusion starts after it is merged. These are contributor conventions; no PR-title
check is currently enforced by CI.

## Proposed shared PR contributions

Status: User-requested direction documented on 2026-11-18. ADR-0009 and DEP-02 were subsequently
approved; CI implementation is in progress. The standing delivery permissions below remain
**proposed, not active**, pending CONTRIB-01 acceptance and verified setup. The user wants CI prioritized before M2 so several
agent tools, including Claude, Codex/GPT, Grok or later tools, can contribute changes for human
review. No tool's GitHub integration, bot identity, subscription or cloud environment is assumed
available. Current commit/push restrictions above still apply until this process is accepted and
the relevant setup is verified. This documentation request does not authorize remote changes.

### Common contribution contract

The same scope, correctness requirements and checks apply to every contributor. Each tool must
receive this repository's instructions explicitly if it does not discover `AGENTS.md` itself.
Provider-specific setup should point to this contract rather than maintain divergent copies.

The proposed delivery sequence is:

```mermaid
flowchart LR
    Scope[User approves a bounded task] --> Branch[Isolated checkout and task branch]
    Branch --> Draft[Draft PR]
    Draft --> Checks[Required CI on current candidate]
    Checks -->|Failure| Fix[Contributor fixes its PR]
    Fix --> Checks
    Checks -->|Pass| Ready[Ready for human review]
    Ready --> Review[User reviews behavior and evidence]
    Review -->|Changes requested| Fix
    Review -->|Accepted| Merge[User merges after current checks]
```

Once explicitly accepted and enabled, a task approval that includes PR delivery would authorize
the contributor to create commits, push its task branch, open/update its draft PR, inspect CI and
repair failures within that task. It would not authorize unrelated work, changes to another
contributor's branch, direct writes to `main`, approval/merge of a PR, enabling auto-merge,
repository administration, credential provisioning or deployment. A code-task approval without
PR delivery in its scope would not silently acquire those permissions.

### Scope and concurrent work

- One coherent task per PR and an isolated checkout/branch per change. Use the `codex/` branch
  prefix for Codex-created branches; other tools may use their own documented prefix.
- Define shared interfaces and dependencies before dependent changes begin. Sequence conflicting
  schema, manifest/lockfile, API or policy changes, or explicitly scope their integration.
- The initial proposed operating limit is two independent implementation PRs at a time. Review
  CI reliability, conflicts, cost and human review capacity before increasing it. This is an
  adjustable workflow policy, not an application limit or a promise of a particular speedup.
- Technical records describe the resulting behavior, decisions and evidence. Assignments and
  scheduling remain in chat under `AGENTS.md`; the number/provider of contributors does not
  change the architecture or acceptance criteria.

### Identity and human control

Use traceable authenticated contributor identities, preferably GitHub App installation identities
scoped to this repository. Separate independently operated tool credentials so access can be
revoked independently. A model name is not an authentication mechanism; changing Git commit
metadata does not select the PR author. One identity can serve several models within one trusted
tool boundary. Exact apps, names and adapters are selected and verified in
[CONTRIB-01](tasks/CONTRIB-01-shared-pr-contributor-setup.md).

The user reviews and merges. A second tool may inspect a PR and report findings; that review does
not replace required CI or the user's decision. A reviewer should reason from requirements and
failure cases rather than merely agree with the implementation. No tool may approve its own PR,
weaken required checks or change protection settings to make its delivery pass. Changes to tests,
CI, authentication and permissions receive explicit human scrutiny within their approved scope.

### Review-ready handoff

Keep a PR draft while required checks are failing, missing, cancelled, skipped or stale. Before
requesting review, the contributor must inspect actual check results for the latest candidate,
resolve failures within scope, and record unavailable external checks honestly. New code after
review requires fresh checks and review under repository protection. If the base branch changes,
revalidate the combined result before merge; an earlier independent pass is insufficient.

The PR description states the problem, final behavior, linked approved task, actual validation and
material limitations. Attach concise reports and browser traces/screenshots when they help review.
Keep routine logs, databases, secrets and repeated output out of Git; selected sanitized milestone
evidence may remain in `docs/evidence/`. A passing check cannot establish complete requirement
coverage, financial correctness, security or absence of defects.

The technical check contract and trust boundaries are accepted in
[ADR-0009](adr/0009-pr-verification-and-repository-trust.md). Implement and verify them through
[DEP-02](tasks/DEP-02-pr-verification-and-cloud-compatibility.md) before enabling routine PR
delivery through CONTRIB-01. Hosting/release work retains its own approval gates.

## Work lifecycle

Plan bounded deliverables and any delivery estimates per task or milestone. Do not impose a
project-wide completion date or permanent feature ceiling. A milestone's scope controls its work;
it does not exclude separately reviewed capabilities from the product's future.

1. **Prepare.** Select a backlog item and create a detailed task from the
   [template](tasks/TEMPLATE.md) when it is close enough to implementation. State boundaries,
   dependencies, acceptance criteria, and expected checks. Do not create detailed plans for every
   distant backlog item.
2. **Decide.** Link existing accepted ADRs or draft the architectural decision needed for the task.
   Use the [ADR lifecycle](adr/README.md). Research current official sources when selecting APIs,
   deployments, or dependency versions; preserve unresolved questions as unresolved.
3. **Review and approve.** Present the concrete scope and decision for review. Record the user's
   actual authorization in the task, and design acceptance in its ADR. Stay in proposed state
   until approval exists.
4. **Implement only the approved scope.** Keep changes incremental, preserve user work, and obey
   [correctness requirements](CORRECTNESS.md) and [engineering conventions](ENGINEERING.md).
5. **Validate.** Run meaningful checks appropriate to the change. Record what ran, its result, and
   what remains failed, skipped, or unverified. Missing RPC access does not turn fixtures into
   integration evidence.
6. **Hand off.** Update task evidence, backlog summary, and [current state](STATUS.md). Report the
   outcome, how to use it when applicable, material limitations, and the next proposed action.
   Do not start that next action without approval.

## Task states

| State | Meaning |
| --- | --- |
| Proposed | Scope is being prepared or awaiting approval; no implementation authorized |
| Approved | User authorization is recorded for the specified scope |
| In progress | Approved work has started |
| Blocked | Approved work cannot proceed; record the concrete dependency and needed decision |
| Done | Acceptance criteria are met, evidence is recorded, and limitations are disclosed |
| Cancelled | The user has withdrawn or replaced the task |

ADRs have their own decision states. An accepted ADR can exist alongside a proposed task.
Do not mark incomplete work Done because time is short.

## Documentation maintenance

Update only the canonical documents affected by a change, following the
[documentation map](README.md). Record durable decisions in ADRs and task evidence in task records.
Keep the current-state summary short enough for a new session to read first; do not store a chat
transcript or duplicate the entire plan there.
