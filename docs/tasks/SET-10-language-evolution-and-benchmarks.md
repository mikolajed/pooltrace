# SET-10: TypeScript-first direction and migration benchmarking

- State: Done
- Milestone: Documentation setup
- Related ADRs: [ADR-0002](../adr/0002-typescript-first-and-measured-evolution.md)
- Requirement IDs: CR-01 through CR-11; setup-only approval boundary
- Depends on: User's explicit request to document the agreed direction

## Outcome

Document an initial TypeScript application, planned evolution potentially using Rust/TypeScript/
Python, and a reproducible comparison of the baseline and later upgrades.

## Scope

Record the accepted strategic direction in ADR-0002. Add a draft benchmark methodology and link it
from the documentation map, engineering conventions, roadmap, backlog, and current state. Keep
ADR-0001 and the first implementation task consistent with the selected language direction.

## Outside scope

Code, scaffolding, dependency installation, benchmark execution/results, final future process
topology, and acceptance of the proposed workspace/runtime. Solidity remains the execution-contract
language. No implementation or commits are authorized.

## Acceptance criteria

- [x] Initial backend/frontend application code is explicitly TypeScript.
- [x] Rust backend migration and Python research are planned candidates, not initial services.
- [x] The distinction between a selected strategy and implementation approval is explicit.
- [x] The benchmark plan requires correctness parity, controlled inputs, separate workloads,
  environment/version records, repeated measurements, and disclosed tradeoffs.
- [x] Local links, requirement references, and status consistency are checked.
- [x] Changes remain documentation-only and preserve the supplied logo.

## Planned validation

Check local Markdown links, requirement IDs, ADR/task status references, document consistency,
and file inventory. Compare the preserved logo hash with the recorded reference. No product
tests or benchmark runs apply.

## Approval record

- Strategic direction: Explicit user request on 2026-11-17 to record starting purely in TypeScript,
  planning later Rust/TypeScript/Python expansion, and benchmarking the upgrade; see ADR-0002.
- Documentation work: Authorized by that request.
- Implementation approval: Not granted.
- Detailed future architecture and benchmark execution: Not granted.

## Evidence and handoff

Validated on 2026-11-17:

- Checked 20 Markdown files: no broken local links, unknown CR requirement IDs, or trailing whitespace.
- Confirmed ADR-0001 remains Proposed, ADR-0002 records the accepted strategic direction, and M1-01
  remains Proposed with implementation approval explicitly not granted.
- Confirmed current state still prohibits implementation and the benchmark plan declares no runs
  or results. Reviewed the README, engineering/product documents, roadmap, and ADR index for the
  updated language direction.
- Inspected the file inventory: no application code, manifests, lockfiles, dependencies, tests, or
  benchmark harness were introduced. Changes in this task are Markdown documentation only.
- The preserved logo SHA-256 matches the previously recorded reference:
  `b45aa4306ed34de83f59a0b3bb13035a33cfb9b77eb370aea6220c1cea91442f`.
- Product tests, live RPC checks, forks, and benchmarks were not run; no implementation exists.

M1-01 remains proposed and unauthorized. No commit was created. The future migration architecture
and detailed benchmark methodology remain subject to review before their implementation/execution.
