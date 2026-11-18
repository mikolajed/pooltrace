# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-04 are complete. ADR-0006 is Accepted; no M1-05 implementation is approved.**

The user accepted ADR-0005 and explicitly approved M1-03 with “i accept m1-03”. Its bounded
registry/snapshot implementation and offline/read-only live checks are complete. Individual
[task records](BACKLOG.md) maintain approval and evidence; [WORKFLOW.md](WORKFLOW.md) governs
subsequent work. The user approved M1-04 with “i accept m1-04” and accepted ADR-0006 on 2026-11-18
with “i accept adr6”. No M1-05 implementation is approved.
Only the user creates commits.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0006.
- Bun workspace/toolchain foundation, pinned versions, strict TypeScript, Biome, and Vitest.
- `packages/protocols`: sourced Ethereum USDC/WETH candidates, factory discovery, identity and
  structural verification, and a bounded hash/canonical RPC reader using viem 2.57.20.
- `apps/backend`: private configuration, immutable one-attempt observations, independent
  completeness/canonicality/freshness/origin flags, and explicit revalidation before use.
- Fifty passing offline tests and a successful Alchemy live run at block **26436521**, including
  same-block state replay and elapsed validation expiry/revalidation. Actual results, limitations,
  and the sanitized report are in [M1-03 evidence](tasks/M1-03-registry-and-consistent-snapshots.md#evidence-and-handoff).
- Root `bun run check` covers all existing code offline. `bun run check:live` is an explicit
  read-only verification harness using the ignored root environment file; setup is in the
  [README](../README.md#development-setup). The endpoint and credentials are not recorded in evidence.
- The supplied perched kingfisher reference remains unchanged.
- Completed [M1-04 research/evidence and M1-05 validation plan](tasks/M1-04-quotation-cycles-and-profitability-design.md).
- Accepted [ADR-0006](adr/0006-quotation-cycles-and-profitability.md) defines quotations, full-input/
  finite-size admission, gross ranking, unavailable initial live net results, and conditional cost
  accounting. Its grid, impact threshold, and operational additions are accepted design policy;
  their implementation and live verification remain M1-05 work.
- A proposed [M1-05 implementation scope](tasks/M1-05-quotation-and-cycle-analysis.md) is ready for
  review, including domain/protocol/backend boundaries and required offline/live completion gates.

## Remaining boundaries

Structural evidence leaves finite-size suitability unavailable and the three-pool workload
unadmitted until M1-04/05. No quotation/cycle/profit engine, public market CLI/API/SSE, UI,
database, background collector, fork/executor, benchmark, or deployment pipeline exists yet.
Serialized integration reports describe past observations; they do not confer current eligibility.

RPC remains an internal backend/protocol boundary with one Ethereum Alchemy endpoint. Future
provider fallback, a possible gateway process, and additional chains remain RPC-01/RPC-02/CHAIN-01
work. SQLite, the UI/backend service lifecycle, and Anvil retain their separately gated tasks.

## Next proposed action

Review the [M1-05 implementation scope](tasks/M1-05-quotation-and-cycle-analysis.md) and separately
approve it before implementation. The task document is prepared; no M1-05 code has been started.

## Latest handoff

The user's M1-04 documentation commit `70a4d1a` is present. ADR-0006 acceptance and the requested
M1-05 scope preparation are recorded on 2026-11-18. Technical policy, application files, and
dependencies are unchanged. These documentation changes remain uncommitted; no agent commit/push,
new live/fork check, or M1-05 implementation occurred.
