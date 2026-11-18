# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-05 are complete. No subsequent task is approved.**

The user accepted ADR-0006 and explicitly approved M1-05 on 2026-11-18 with “i accept m1-05”.
Its bounded domain/protocol/backend implementation and offline/read-only live gates are complete.
[Task records](BACKLOG.md) own approvals and evidence; [WORKFLOW.md](WORKFLOW.md) governs later work.
Only the user creates commits.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0006.
- Bun workspace/toolchain foundation, strict TypeScript/Biome, pinned viem/Vitest, and 95 passing
  offline tests across four files, including the preserved M1-03 checks.
- `packages/domain`: exact sizes/V2 arithmetic, rational impact/full-input predicates, composition
  support, deterministic gross ranking, and conditional cost arithmetic with explicit evidence.
- `packages/protocols`: sourced Ethereum registry, identity/structural verification, hash-bound
  bounded RPC, Router02 comparison, QuoterV2 calls, and quotation-contract provenance.
- `apps/backend`: immutable snapshots and analysis/qualification records, all 36 route/size
  outcomes, shared quote/control budgets, use-time eligibility, revalidation, and invalidation.
- A successful fully qualified live grid at block **26441925**, deterministic same-block historical
  replay including ranking, and real elapsed expiry/revalidation. The best gross result was
  negative; transaction costs/net profit remained unavailable. Actual results and the archived
  report are in [M1-05 evidence](tasks/M1-05-quotation-and-cycle-analysis.md#evidence-and-handoff).
- Passing workspace and clean-install `bun run check` gates. Explicit `bun run check:live` and
  `bun run check:quotes:live` harnesses use the ignored private environment file; setup is in the
  [README](../README.md#development-setup). There is no fallback provider or implicit fixture mode.
- The supplied perched kingfisher reference remains unchanged.
- A proposed [M1-06 CLI/configuration scope](tasks/M1-06-cli-and-configuration.md) is ready for
  review; implementation remains unapproved and has not started.

## Remaining boundaries

Qualification belongs to each observation/input/policy, not permanent admission of a venue.
M1-03 snapshots retain structural-only suitability; linked M1-05 records supply finite-size
evidence. Stored reports describe past events and do not restore current live eligibility.

No full-transaction cost producer, executor, fork execution, public market CLI/API/SSE, UI,
database, background service lifecycle, benchmark, or deployment pipeline exists yet. Gross
quotation is not net profit, execution success, finality, or capture evidence.

RPC remains an internal backend/protocol boundary using one Alchemy Ethereum endpoint. Future
provider fallback/gateway and additional chains remain RPC-01/RPC-02/CHAIN-01 work. SQLite and
UI/backend services retain their separately gated M1 tasks; executor/Anvil/cost generation remain M2.

## Next proposed action

Review the [M1-06 CLI/configuration scope](tasks/M1-06-cli-and-configuration.md) and separately
approve it before implementation. Persistence and browser tasks remain on the backlog.

## Latest handoff

The user's M1-05 commit `5987f92` is present. The requested M1-06 scope document and backlog/current
state links are prepared for review and remain uncommitted. No M1-06 implementation, new RPC
validation, agent commit, or push occurred during preparation.
