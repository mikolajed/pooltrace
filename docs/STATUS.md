# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-08 are complete. Later work is unapproved.**

The user accepted M1-08's bounded documentation scope on 2026-11-18 with “i accept”. The
[task record](tasks/M1-08-mathematics-and-evidence-documentation.md) owns approval and actual
documentation checks; earlier task records retain their own approvals/evidence.
[WORKFLOW.md](WORKFLOW.md) governs later work. The user separately requested the completed M1-08
documentation commit, followed by preparation of M1-09's scope. No push is authorized.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0006.
- Pinned Bun/Node workspace, strict TypeScript/Biome, viem/Vitest, and **158 passing offline tests**
  across eight files, recorded in M1-07 with a clean frozen-lockfile install without private config.
  The behavioral suite/install was not repeated for M1-08's Markdown-only changes.
- The [analysis guide](ANALYSIS.md) explains implemented mathematics, exact constructed examples,
  result/lifecycle interpretation, and actual archived evidence. Root README remains the command
  reference; source/requirements/ADRs/task records retain their separate authority.
- M1-07 adds 42 regression cases, including a 205-input V2 property corpus, independent vectors,
  asymmetric token direction/units, isolated quote failures, and running-analysis lifecycle faults.
  No production correction or dependency change was required. Coverage/reuse and historical live
  evidence are mapped in [M1-07 evidence](tasks/M1-07-validation-and-regression-coverage.md#evidence-and-handoff).
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

Prepare M1-09's bounded SQLite design scope for review. It has not started; no driver/schema,
migration, dependency, database creation, or implementation is authorized by M1-08 completion.

## Latest handoff

Requested M1-07 completion commit: `99fe048` (`test: complete M1-07 validation and regression coverage`).
M1-08's guide, scope/approval/evidence, and navigation updates are included in the subsequent
commit explicitly requested by the user. New help and fixture text/JSON commands passed; exact
examples and archived provenance were checked. No new live RPC, application/test/configuration/
evidence change, dependency installation, push, or later implementation was introduced.
