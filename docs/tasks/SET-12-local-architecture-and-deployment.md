# SET-12: Local architecture and future deployment gates

- State: Done
- Milestone: Documentation setup
- Related ADRs: [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md)
- Requirement IDs: CR-01 through CR-11; explicit implementation approval boundary
- Depends on: User acceptance of the local architecture recommendation and request to update docs

## Outcome

Document separate local UI/backend processes, minimal SQLite in the first backend milestone,
on-demand serialized Anvil jobs later, and future CI/CD checks before production changes.

## Scope

Add ADR-0004 and the deployment plan. Align the roadmap, backlog, current state, engineering/product
references, and proposed foundation task. Preserve ADR-0003's accepted history while recording that
ADR-0004 refines persistence timing/write ownership. Keep future pipeline details unimplemented.

## Outside scope

Code, manifests, dependencies, UI/backend/Anvil processes, databases, schemas, tests, CI workflows,
containers, hosting, infrastructure, production changes, and commits.

## Acceptance criteria

- [x] Local architecture has two application processes; collection/analysis/RPC remain backend modules.
- [x] Minimal persistence and a minimal browser view move into M1; later milestones retain distinct roles.
- [x] SQLite is embedded/backend-owned; Anvil is separate/on demand in M2 with one active job initially.
- [x] Future release checks, staging, candidate identity, explicit approval, health checks, and recovery
  are documented without selecting a provider or configuring a pipeline.
- [x] Current references, ADR history, task/approval states, local links, and requirement IDs are checked.
- [x] Documentation-only scope and original logo preservation are confirmed.

## Approval record

The user asked for deployment/CI/CD planning, then clarified localhost/process separation and asked
whether SQLite should start early and Anvil should be separate. After the architecture recommendation,
the user said “ok, update docs” on 2026-11-17. This accepts recording the agreed design and future
release intent; application and infrastructure implementation are not approved.

## Evidence and handoff

Validated on 2026-11-17:

- Checked 25 Markdown files: no broken local links, unknown CR requirement IDs, or trailing whitespace.
- Reviewed current milestone and storage references: M1 contains basic persistence/UI, M2 introduces
  Anvil jobs, M3 extends evidence/replay/recovery, and M4 refines the terminal.
- Confirmed ADR-0003 retains its original decision text with a partial-supersession notice linking
  ADR-0004. ADR-0001 remains Proposed; M1-01 remains Proposed with no implementation approval.
- Confirmed current state retains the approval gate and the deployment document explicitly states
  that no workflow, infrastructure, or production environment exists.
- Inspected the file inventory: this task changed Markdown only; no code, manifests, SQLite file,
  Anvil process, workflow YAML, container/provisioning files, or dependencies were introduced.
- The logo matches the recorded SHA-256:
  `b45aa4306ed34de83f59a0b3bb13035a33cfb9b77eb370aea6220c1cea91442f`.
- Checked official SQLite backup, Foundry Anvil, Next.js deployment, and GitHub deployment-environment
  references; links and retrieval date are in DEPLOYMENT.md. No hosting/CI provider was selected.
- No product tests, fork runs, CI jobs, deployments, or benchmarks were performed. No commit was created.

The next proposed task remains M1-01. Exact runtime/layout, storage/API details, application code,
and pipeline/infrastructure implementation still require their own approval.
