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
