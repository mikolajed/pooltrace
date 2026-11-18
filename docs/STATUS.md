# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-06 are complete. Later implementation is unapproved.**

The user accepted M1-06 and authorized its implementation and initial scope-document commit with
“Lgtm, commit now, then mark this as accepted and move on with more work”.
The [M1-06 record](tasks/M1-06-cli-and-configuration.md) owns that bounded approval and evidence;
[WORKFLOW.md](WORKFLOW.md) governs later tasks. The user separately requested the completed M1-06
implementation commit. The default user-only commit rule otherwise remains.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0006.
- Pinned Bun/Node workspace, strict TypeScript/Biome, viem/Vitest, and **116 passing offline tests**
  across five files, also passing after a clean frozen-lockfile install without private config.
- `packages/domain`: exact sizes/V2 arithmetic, rational impact/full-input predicates, composition,
  deterministic signed gross ranking, and conditional cost arithmetic with explicit evidence.
- `packages/protocols`: sourced Ethereum registry, identity/structural verification, bounded
  hash-bound RPC, Router02 comparison, QuoterV2 calls, and separate constructed fixture transports.
- `apps/backend`: immutable snapshots/analysis, all 36 route/size outcomes, shared quote/control
  budgets, use-time eligibility, revalidation, and invalidation.
- `bun run cli --mode live|fixture`, with exact plain-text or `--format json` output. Modes are
  explicit; fixture data is constructed and cannot confer live admission. Configuration, exits,
  and setup are in the [README](../README.md#diagnostic-cli).
- Successful real live CLI text/JSON runs with 36/36 qualified comparisons at their recorded
  as-of events. Best tested gross was negative; costs/net profit were unavailable. Actual reports
  are linked from [M1-06 evidence](tasks/M1-06-cli-and-configuration.md#evidence-and-handoff).
- M1-05 retains independent live-grid, same-block replay, and elapsed expiry/revalidation evidence.
  Explicit `bun run check:live` and `bun run check:quotes:live` remain integration harnesses.
- The supplied perched kingfisher reference is unchanged.

## Remaining boundaries

Qualification belongs to each observation/input/policy. M1-03 source snapshots retain structural-only
suitability; M1-05 analysis records supply finite-size evidence. Output and archived reports are
as-of events, not continuing live eligibility or a positive profitability/capture claim.

No full-transaction cost producer, executor, fork execution, HTTP API/SSE, UI, database, background
service lifecycle, benchmark, or deployment pipeline exists yet. Gross quotation is not net profit,
execution success, finality, or capture evidence.

RPC remains an internal backend/protocol boundary using one Alchemy Ethereum endpoint. Provider
fallback/gateway and additional chains remain RPC-01/RPC-02/CHAIN-01. SQLite and UI/backend services
retain separately gated M1 tasks; executor/Anvil/cost generation remain M2.

## Next proposed action

Prepare the bounded M1-07 validation scope for review: assess existing arithmetic, ordering,
rounding, composition, and snapshot-failure evidence, then identify remaining meaningful gaps.
M1-07 has not started and is not authorized by M1-06 completion.

## Latest handoff

Requested scope-document commit: `843c8ba` (`docs: prepare M1-06 CLI and configuration scope`).
M1-06 acceptance, implementation, tests, documentation, and evidence are included in the subsequent
implementation commit explicitly requested by the user. No push or later task was started.
