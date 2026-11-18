# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-10 are complete. Later work remains unapproved.**

The user accepted ADR-0007 with “i accept adr7”, then approved M1-10 with “i accept m1-10” on
2026-11-18 after its scope was committed. The [M1-10 task](tasks/M1-10-minimal-evidence-store.md)
owns approval, actual implementation/native/offline/process/live evidence, and limitations.
Earlier records retain their own evidence. [WORKFLOW.md](WORKFLOW.md) governs later work;
no M1-11 or push is authorized. The user separately requested the completed M1-10 commit.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0007.
- [Accepted ADR-0007](adr/0007-minimal-sqlite-evidence-store.md) specifies a minimal SQLite
  evidence store: native driver, exact immutable versions, atomic saves, historical reads,
  migration/failure rules, and CLI persistence. M1-10 implements the backend-owned embedded store
  with better-sqlite3 13.2.0 / SQLite 3.54.1 on the unchanged Node pin; verified on macOS arm64.
- Pinned Bun/Node workspace, strict TypeScript/Biome, viem/Vitest, and **205 passing offline tests**
  across nine files, including 47 new storage/CLI cases. Full checks and clean frozen-lockfile
  installation/checks passed without private configuration; tests use isolated files/processes.
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
  budgets, use-time eligibility, revalidation, terminal invalidation, and exact versioned storage.
- `bun run cli --mode live|fixture`, with exact plain-text or `--format json` output. Modes are
  explicit; fixture data is constructed and cannot confer live admission. Configuration, exits,
  and setup are in the [README](../README.md#diagnostic-cli). cli-v2 reports independent save
  status and confirmed revision IDs. Default live/fixture files are separate; history is backend-only.
- Real cli-v2 live text/JSON runs both saved 36 qualified outcomes and matched stored analysis
  after reopen. Best tested gross was negative; cost/net remained unavailable. Loaded evidence is
  historical with no restored current admission. Details are in M1-10, separate from older reports.
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

No full-transaction cost producer, executor, fork execution, HTTP API/SSE, UI, background
service lifecycle, benchmark, or deployment pipeline exists yet. Gross quotation is not net profit,
execution success, finality, or capture evidence.

RPC remains an internal backend/protocol boundary using one Alchemy Ethereum endpoint. Provider
fallback/gateway and additional chains remain RPC-01/RPC-02/CHAIN-01. Further storage changes
retain their own scopes; UI/backend service lifecycle remains M1-11/M1-12 and
executor/Anvil/cost generation remains M2. Broader history/recovery/backup is M3; physical disk
failure, power loss, other-platform compatibility, and performance remain unverified.

## Next proposed action

Prepare M1-11's bounded local API/SSE/minimal browser scope for review when requested.
It has not been prepared or started. Completion of M1-10 does not authorize it.

## Latest handoff

Requested M1-07 completion commit: `99fe048` (`test: complete M1-07 validation and regression coverage`).
Requested M1-08 documentation commit: `c9414e2` (`docs: complete M1-08 analysis guide and evidence documentation`).
Requested M1-09 design commit: `8360629` (`docs: complete M1-09 SQLite evidence-store design`).
Requested acceptance/scope commit: `07660ec` (`docs: accept ADR-0007 and prepare M1-10 implementation scope`).
The user requested a completion commit for M1-10's implementation, tests, two new actual live
report archives, and documentation updates. No later task, push, API/UI, service, fork, or execution
was introduced.
