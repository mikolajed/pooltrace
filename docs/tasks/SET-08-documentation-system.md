# SET-08: Documentation responsibilities and work records

- State: Done
- Milestone: Documentation setup
- Related ADRs: None; no implementation architecture is changed
- Requirement IDs: User's setup-only and explicit implementation-approval requirements
- Depends on: Existing setup documentation

## Outcome

A navigable documentation system with clear ownership of product requirements, engineering
conventions, architectural decisions, task authorization, and evidence.

## Scope

Shorten AGENTS.md to an entry point and approval guardrail. Add the documentation map, workflow,
engineering/correctness references, current-state summary, and task template. Prepare the first
implementation task without authorizing it. Update existing documents to link canonical sources.

## Outside scope

Application code, scaffolding, dependency installation, architecture acceptance, implementation
approval, logo editing, and commits.

## Decisions and open questions

Documentation ownership is described in [the map](../README.md). ADR-0001 and M1-01 remain proposed;
the worker runtime is still an open design question.

## Acceptance criteria

- [x] AGENTS.md contains the approval guardrail and reading route without duplicating the brief.
- [x] Each document has a distinct purpose and a canonical-source rule.
- [x] Correctness requirements have stable IDs that backlog and task records can reference.
- [x] ADR design acceptance is separate from implementation authorization in task records.
- [x] Current state and the next proposed task are explicit.
- [x] Local document links and references are checked; results are recorded below.
- [x] Only documentation is changed, preserving the logo and basic setup configuration.

## Planned validation

Check local Markdown targets, numbered correctness references, task/ADR metadata, file inventory,
and that the preserved logo is unchanged. No product or integration tests are applicable.

## Approval record

- Design acceptance: Not applicable to an implementation architecture; ADR-0001 remains proposed.
- Documentation work requested: The user's 2026-11-17 request for a more robust system of Markdown
  files, following the explicit setup-only boundary.
- Implementation approval: Not granted; this record covers documentation work only.

## Evidence and handoff

Validated on 2026-11-17:

- Checked 17 Markdown files: no broken local links, unknown CR requirement IDs, or trailing whitespace.
- Confirmed AGENTS.md is a 28-line entry point.
- Inspected the file inventory: no application code, manifests, dependency installs, or test suite
  were introduced. Basic setup configuration was left unchanged.
- Compared SHA-256 hashes of the repository logo and the original attachment; both were
  `b45aa4306ed34de83f59a0b3bb13035a33cfb9b77eb370aea6220c1cea91442f`.
- Product tests, live RPC checks, and fork simulations were not run; no implementation exists.

The next proposed development action remains [M1-01](M1-01-tooling-and-workspaces.md), which is not
authorized. No architecture decision was accepted and no commit was created.
