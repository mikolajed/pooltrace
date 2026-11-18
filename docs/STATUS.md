# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-09 are complete. ADR-0007 is Accepted; M1-10's scope is prepared for review.**

The user accepted M1-08's bounded documentation scope on 2026-11-18 with “i accept”. The
[task record](tasks/M1-08-mathematics-and-evidence-documentation.md) owns approval and actual
documentation checks; earlier task records retain their own approvals/evidence.
[WORKFLOW.md](WORKFLOW.md) governs later work. The user separately requested the completed M1-08
documentation commit, followed by preparation of M1-09's scope. No push is authorized.
The user approved M1-09 design delivery with “i accept” on 2026-11-18. Its
[task record](tasks/M1-09-minimal-sqlite-design.md#evidence-and-handoff) owns actual research/paper
checks. After the design commit, the user accepted ADR-0007 on 2026-11-18 with “i accept adr7”.
This accepts the storage design; M1-10 implementation remains unapproved.
The user requested “prep m1-10”; its [Proposed scope](tasks/M1-10-minimal-evidence-store.md)
is prepared. No dependency installation, database, migration, or implementation is authorized yet.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0007.
- [Accepted ADR-0007](adr/0007-minimal-sqlite-evidence-store.md) specifies a minimal SQLite
  evidence store: native driver, exact immutable versions, atomic saves, historical reads,
  migration/failure rules, and CLI persistence design. No driver/store is installed.
- Pinned Bun/Node workspace, strict TypeScript/Biome, viem/Vitest, and **158 passing offline tests**
  across eight files, recorded in M1-07 with a clean frozen-lockfile install without private config.
  The behavioral suite/install was not repeated for M1-08/M1-09's Markdown-only changes.
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

Review [M1-10: Minimal SQLite evidence store](tasks/M1-10-minimal-evidence-store.md) under
[accepted ADR-0007](adr/0007-minimal-sqlite-evidence-store.md). Implementation has not started;
do not install the driver, open a database, or implement the store before approval.

## Latest handoff

Requested M1-07 completion commit: `99fe048` (`test: complete M1-07 validation and regression coverage`).
Requested M1-08 documentation commit: `c9414e2` (`docs: complete M1-08 analysis guide and evidence documentation`).
Requested M1-09 design commit: `8360629` (`docs: complete M1-09 SQLite evidence-store design`).
ADR-0007 acceptance, M1-10 scope preparation, and navigation/current-state updates are Markdown
only; the user separately requested their commit. The new task covers driver verification, exact immutable evidence, atomic saves,
historical reads, cli-v2 persistence, isolated tests, and real-file/process/fault validation.
Official version-specific research and paper checks are recorded in M1-09. Database/
native-driver behavior remains unverified; there was no database/connection, installation,
code/test change, new live check, push, or M1-10 implementation.
