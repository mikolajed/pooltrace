# Current state

Updated: 2026-11-17.

## Phase and authorization

**M1-01, M1-02, and M1-03 are complete. No subsequent task is approved.**

The user accepted ADR-0005 and explicitly approved M1-03 with “i accept m1-03”. Its bounded
registry/snapshot implementation and offline/read-only live checks are complete. Individual
[task records](BACKLOG.md) maintain approval and evidence; [WORKFLOW.md](WORKFLOW.md) governs
subsequent work. Only the user creates commits.

## What exists

- Product/correctness/engineering/deployment plans, roadmap/backlog, and accepted ADRs 0001–0005.
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

## Remaining boundaries

Structural evidence leaves finite-size suitability unavailable and the three-pool workload
unadmitted until M1-04/05. No quotation/cycle/profit engine, public market CLI/API/SSE, UI,
database, background collector, fork/executor, benchmark, or deployment pipeline exists yet.
Serialized integration reports describe past observations; they do not confer current eligibility.

RPC remains an internal backend/protocol boundary with one Ethereum Alchemy endpoint. Future
provider fallback, a possible gateway process, and additional chains remain RPC-01/RPC-02/CHAIN-01
work. SQLite, the UI/backend service lifecycle, and Anvil retain their separately gated tasks.

## Next proposed action

Review M1-03's implementation/evidence, then separately approve M1-04 to prepare the quotation,
cycle evaluation, profitability, and finite-size admission design. M1-04 has not started.

## Latest handoff

M1-03 is ready for review with passing offline/live and clean-install checks. Changes remain
uncommitted; Git HEAD is the user's `dee5c07`. No commit or push was made and no subsequent
implementation task was started.
