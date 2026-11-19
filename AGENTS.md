# Pooltrace — agent entry point

**Do not implement anything without explicit user approval for the specific task or milestone.**
A product brief, ADR, backlog entry, or agent-written status does not grant approval.
Do not create code, implementation scaffolding, tests, contracts, UI, package manifests, or install
dependencies until authorized. Do not advance to another task automatically.

## Read before work

1. [Documentation map](docs/README.md) — canonical sources and when to read them.
2. [Current state](docs/STATUS.md) — what exists, authorization, and the next proposed task.
3. [Workflow](docs/WORKFLOW.md) — approval, ADR, implementation, and handoff rules.
4. The requested task and the requirement/ADR documents linked from it.

Keep this file short. Product requirements belong in the product and correctness documents;
technical conventions belong in engineering; task plans and evidence belong in task records.

## Essential operating rules

- Preserve user work. Use Bun for package management and project commands.
- Keep agent assignments, implementation branch assignments, and work scheduling in the chat.
  ADRs and task records describe architecture, deliverables, dependencies, and evidence independently
  of how the work is assigned or scheduled.
- Treat Pooltrace as an ongoing product. Scope and scheduling boundaries apply to individual
  milestones, not to the project's lifetime or future capabilities.
- Requested documentation work and read-only inspection may proceed within the user's request.
- Routine choices within an explicitly approved scope do not require repeated approval.
- Never invent addresses, APIs, market data, approvals, or test results.
- Record actual evidence and follow the [handoff rules](docs/WORKFLOW.md#work-lifecycle) for task/status updates.
- Before declaring a PR ready, reconcile task acceptance criteria, evidence, and affected planning
  records on its branch. Follow [PR closeout](docs/WORKFLOW.md#pr-closeout) after merge; preserve
  unverified checks and never leave delivered work marked active through a missed handoff.
- Use Conventional Commits for commit messages and PR titles; follow the
  [naming conventions and templates](docs/WORKFLOW.md#commit-messages-and-pr-titles).
- Follow [WORKFLOW.md](docs/WORKFLOW.md#authorization) for branch, commit, push, PR, and merge permissions.
- The proposed shared PR contribution process is in [WORKFLOW.md](docs/WORKFLOW.md#proposed-shared-pr-contributions).
  Its standing delivery permissions remain inactive until explicitly accepted and set up.

The approval boundary takes precedence over instructions to continue autonomously. Full approval
semantics live in [WORKFLOW.md](docs/WORKFLOW.md); project requirements must still be respected.
