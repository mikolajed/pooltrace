# SET-13: Product framing and milestone scope

- State: Done
- Milestone: Documentation setup
- Related records: [PRODUCT.md](../PRODUCT.md), [ROADMAP.md](../ROADMAP.md), ADR-0001 through ADR-0004
- Requirement IDs: CR-01 through CR-11; explicit implementation approval boundary
- Depends on: User's request to revise project framing across the documentation

## Outcome

Describe Pooltrace as an ongoing product with no fixed completion date or permanent feature ceiling.
Scope, acceptance criteria, and any delivery estimates apply to individual milestones.

## Scope

Remove obsolete purpose, personal application context, and project-duration wording throughout the
repository documentation, including ADR contexts and previous task summaries. Update roadmap/backlog
labels and make current workloads and execution boundaries explicitly milestone-specific. Preserve
technical decisions, stable record IDs, approval states, correctness obligations, and the logo.

The user explicitly requested this cleanup across the records. It updates descriptive context and
planning language without manufacturing new architectural approvals or implementation permission.

## Outside scope

Implementation, dependency installation, infrastructure, changes to Git history, commits, or
automatic expansion of any currently defined task or milestone.

## Acceptance criteria

- [x] Product identity describes an ongoing research/simulation product without a fixed lifespan.
- [x] Obsolete origin framing and personal application context are removed from descriptive and
  historical text.
- [x] Scope and scheduling boundaries attach to milestones; future capabilities remain open.
- [x] Current correctness obligations, execution permissions, and implementation gates are preserved.
- [x] Repository-wide wording, document links, requirement references, whitespace, and approval states
  are checked after the cleanup.
- [x] Changes are documentation-only and the supplied logo is unchanged.

## Approval record

On 2026-11-17 the user explicitly requested removing obsolete project framing everywhere and keeping
scope boundaries only at milestone level. This authorizes documentation cleanup, including context
in existing records; it does not authorize code, new milestone implementation, or commits.

## Evidence and handoff

Validated on 2026-11-17:

- Repository-wide wording checks found no remaining obsolete origin, personal application, or
  project-duration framing in the working tree.
- Checked 26 Markdown files: no broken local links, unknown CR requirement IDs, or trailing whitespace.
- `git diff --check` passed. Reviewed changed-file inventory: Markdown only, with no code,
  configuration, dependency, database, or infrastructure changes.
- Confirmed ADR-0001 remains Proposed, ADR-0002/0003/0004 retain their Accepted states, M1-01 remains
  Proposed with no implementation approval, and the setup-only guardrail is unchanged.
- Current workloads and local-fork execution are scoped to M1/M2. Financial correctness and evidence
  requirements remain in place for the work they govern.
- The logo matches its recorded SHA-256:
  `b45aa4306ed34de83f59a0b3bb13035a33cfb9b77eb370aea6220c1cea91442f`.
- No product tests, benchmark runs, implementation, Git history changes, or commits were performed.

M1-01 remains the next proposed task and requires explicit approval. Future capabilities are planned
through separately reviewed milestones, without a project-wide completion date or feature ceiling.
