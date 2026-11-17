# M1-02: Registry and consistent-snapshot design

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md)
- Proposed decision record: [ADR-0005 — registry verification and consistent snapshots](../adr/0005-registry-verification-and-consistent-snapshots.md)
- Requirement IDs: CR-02 and CR-03; evidence/validation requirements CR-09 and CR-10 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Satisfied; M1-01 is complete and the user approved this design task on 2026-11-17

## Outcome

A reviewable design for the first market-data backend slice: identify and admit the intended
Ethereum pools, then collect a consistent observation with enough provenance to explain where
every value came from. M1-03 will implement the accepted design under separate approval.

This task produces a proposed ADR and an implementation-validation plan. It does not produce a
working collector. Completion means the proposal is ready for review; it does not mean the ADR
has been accepted or market behavior has been verified in code.

## Scope

Prepare proposed ADR-0005 using current official protocol, Ethereum, and viem documentation.
Record source links, retrieval dates, assumptions, alternatives, and unresolved questions.

The design must cover the following decisions:

| Area | Required decision |
| --- | --- |
| Market scope | Preserve M1's Ethereum mainnet WETH/USDC workload: one Uniswap V2 pool and two selected Uniswap V3 fee tiers. Explain how tiers are selected and when a candidate is admitted. |
| Registry verification | Define authoritative sources and on-chain checks for deployments, tokens, factories, pool identity, token ordering/decimals, and V3 fees. Distinguish a sourced candidate address from an on-chain-verified entry. |
| Liquidity admission | Define the evidence, units, thresholds, and failure policy used to judge suitability for each pool type and the intended trade sizes. Explain what must be rechecked as state changes. |
| Snapshot selection | Choose how to select a block and bind all reads in a comparison to that same chain and block identity. Document provider/API requirements and the response to unsupported capabilities. |
| Provenance | Define the chain ID, block number/hash/timestamp, observation time, registry identity, and read/validation evidence passed to later quotation work. Keep persistence details in M1-09. |
| Freshness and invalidation | Define age measurement, stale thresholds, canonicality/reorganization checks, when revalidation happens, and what occurs when validation is unavailable. |
| Failures and retries | Define bounded retries/timeouts and handling for wrong-chain responses, missing contracts/pools, failed reads, incomplete observations, unavailable historical state, and invalidated snapshots. |
| Ownership and configuration | Keep RPC access/collection in the backend, preserve credentials on that side, and identify configuration and package boundaries needed by M1-03 under ADR-0001/0004. |

Specify observable outcomes for registry rejection, incomplete collection, stale observations,
and invalidated snapshots. A missing or failed read must not become a fabricated zero, a successful
observation, or an implicit switch to fixtures. Pool substitution requires an explicit policy;
do not silently change M1's selected workload to hide a failed admission.

Describe how downstream quotation work receives a validated snapshot and how it detects that the
snapshot has become unusable. Keep this at the design level; executable interfaces and contracts
belong to their approved implementation tasks.

## Outside scope

- Application code, package scaffolding, dependency installation, executable interfaces, or tests.
- V2/V3 quote adapters, cycle calculations, profitability/cost models, or a working CLI/API/UI.
- SQLite driver/schema/migrations, deployment, fork execution, contracts, and benchmarks.
- Live RPC collection or claims that any candidate address, pool, or liquidity level was verified.
  This design task specifies the checks and evidence M1-03 must produce. If later research needs
  live verification, record that separately rather than treating documentation as integration evidence.
- Commits or pushes. Only the user creates commits.

## Decisions and open questions

The workload, backend ownership, Node.js runtime, and Bun tooling are already selected in the
linked requirements and ADRs. The table above identifies decisions this task must resolve before
implementation; it does not preselect their answers.

ADR-0005 was accepted on 2026-11-17, selecting V3 candidate tiers 500/3000, required hash-bound
canonical reads, freshness/retry limits, and a viem integration baseline. Actual pool addresses,
provider capabilities, and live liquidity remain unverified.
Finite-size admission depends on the later quotation/admission policy; the ADR explains what
M1-03 may establish and what must remain unavailable until that work exists.

M1-09 owns the storage design. ADR-0005 identifies the observation/provenance information
storage and later quotation work need without choosing a database schema or implementing them.

## Acceptance criteria

- [x] A proposed ADR-0005 is created and linked from this task and the ADR index.
- [x] The proposal covers every decision in the scope table and traces registry/snapshot choices
  to CR-02/CR-03, including admission, freshness, invalidation, and unavailable-validation behavior.
- [x] Alternatives and their tradeoffs are explicit, with current official sources and retrieval dates.
- [x] Candidate/source evidence is clearly separated from future on-chain verification; no address,
  market-data value, liquidity claim, or successful integration result is invented.
- [x] An M1-03 validation plan defines expected pass/fail outcomes for correct and wrong chain/pool
  identities, token-order/metadata mismatches, insufficient or unavailable liquidity evidence,
  consistent reads, partial failures, stale data, reorganizations, and unavailable validation.
- [x] Offline fixture checks and live RPC integration evidence are distinguished. Missing RPC
  access leaves integration evidence unverified and does not silently enable fixture mode.
- [x] Remaining questions, implementation prerequisites, and scope boundaries are explicit enough
  for the user to accept or amend the design before separately approving M1-03.
- [x] Changes remain documentation-only; links and requirement references are checked, and the
  backlog/current state are updated for handoff.

## Planned validation

Review the proposed ADR against the scope table and requirement IDs. Check that each failure
scenario has an explicit outcome, that snapshot guarantees match the cited capabilities, and that
provenance remains traceable through validation and invalidation. Verify official references when
researching concrete APIs; check local links, approval states, changed-file scope, and whitespace.

No application test, live RPC check, or fork run is part of this documentation task. The M1-03
validation plan is a plan, not a record of tests that ran.

## Approval record

- Documentation preparation: On 2026-11-17 the user requested the actual M1-02 document after being
  given only its backlog link. This authorizes preparing this task record for review.
- Design-task approval: Granted on 2026-11-17. The user said “i apporve # M1-02: Registry and
  consistent-snapshot design”, authorizing the documentation/research scope above.
- Design acceptance: Granted on 2026-11-17 when the user said “i accept adr5”; recorded in ADR-0005.
- Implementation approval: Not granted; M1-03 and later implementation remain separately gated.

## Evidence and handoff

Task scope was prepared for review on 2026-11-17, then approved by the user and completed as a
documentation/research task. The prior preparation evidence below describes the earlier handoff.
No application implementation, dependency installation, live RPC collection, commits, or pushes
were performed during M1-02.

Preparation checks passed: local links/anchors, whitespace, and CR IDs across 27 Markdown files;
`git diff --check`; approval-state checks; and confirmation that the three changed files are this
task, the backlog, and current state. These checks validate the task documentation, not the future
registry/snapshot design or implementation.

Completed design deliverables on 2026-11-17:

- Prepared proposed ADR-0005, linked it from the ADR index, and updated the backlog, roadmap, and
  current state. At that handoff, its technical choices awaited acceptance.
- Consulted current primary sources from Ethereum's EIP/JSON-RPC references, Uniswap protocol
  documentation and contract interfaces/source, Circle's token-address directory, and viem's
  release/API documentation. The ADR links the sources at their claims and records the retrieval date.
- Documented source-backed token/factory candidates without asserting on-chain verification or
  copying pool addresses. No provider was selected and no live liquidity observation was made.
- Proposed hash/canonicality requirements, explicit snapshot/validation/failure policies,
  operational limits, configuration/ownership boundaries, and provenance information.
- Made the liquidity boundary explicit: M1-03 identity/structural evidence does not complete
  CR-02 or admit the finite-size workload. The proposed sequencing and later admission policy
  require review before implementing/admitting that workload.
- Prepared the 18-case offline and read-only live integration plan below. These are expected
  outcomes, not executed application tests. No compiler/runtime compatibility or RPC result is claimed.
- At the design handoff, documentation verification passed for local links/anchors, whitespace, and CR IDs across 28
  Markdown files; `git diff --check` passed. Checks confirmed exactly six documentation files
  changed, M1-02 is Done, ADR-0005 is Proposed, and design acceptance/M1-03 implementation approval
  remain ungranted. Foundation manifests, lockfile, tooling/configuration files, and Git HEAD
  (`5cd1acb`) are unchanged.
- Source navigation encountered obsolete/inaccessible documentation paths; the proposal cites
  successfully retrieved current documentation or official contract interfaces instead. The viem
  release was identified from its official release page; APIs were reviewed in current official
  docs/source, not validated by installing/executing that release. Runtime/provider verification
  remains an M1-03 prerequisite/evidence requirement.

After the user accepted ADR-0005 on 2026-11-17, its acceptance record and current documentation
were updated. The accepted design includes the staged admission boundary. The concrete
[M1-03 task](M1-03-registry-and-consistent-snapshots.md) is now prepared for review and remains
Proposed with no implementation approval. The validation plan below belongs to M1-02 and does not
start M1-03.

Acceptance-recording checks on 2026-11-17 passed: local links/anchors, whitespace, and CR IDs in
29 Markdown files; `git diff --check`; and approval-state checks confirming ADR-0005 is Accepted,
M1-02 remains Done, and M1-03 remains Proposed with no implementation approval. Exactly eight
documentation files changed; foundation files and the user's Git HEAD `db70dbf` are unchanged.

## M1-03 validation plan

This is the validation plan prepared by M1-02, rather than its test report. M1-03 was subsequently
approved and completed; its [task record](M1-03-registry-and-consistent-snapshots.md#evidence-and-handoff)
owns executed checks and live evidence. Accepted ADR-0005 defines the preparatory registry/snapshot
boundary. M1-03 does not implement quotation, finite-size qualification, storage, a public CLI/API,
UI, or an always-running collection process. Adding test tooling belongs to that approved scope.

### Offline checks with explicit fixtures and controlled RPC responses

Use deterministic contract/RPC responses and controlled wall/monotonic clocks, with fixtures
clearly labeled as constructed data. Tests of wire parameters must exercise the actual adapter
and retry configuration, not merely a mocked adapter that bypasses the behavior being checked.

| Case | Expected evidence/outcome |
| --- | --- |
| V01 — configuration and dependency baseline | Missing URL/malformed settings fail before provider access. No implicit public URL, wallet, transaction submission, or provider failover. Pin viem and prove required hash/canonicality APIs compile with the actual toolchain. |
| V02 — provider capability | Exercise both code and contract reads at a selected hash, require the canonical selector on the wire, and reject successful responses to unknown-hash probes. Unsupported selectors/methods end collection explicitly; no number/latest fallback. |
| V03 — chain and header identity | Wrong chain before or after collection, null/pending headers, malformed hashes, negative head lag, or contradictory header metadata make an attempt unusable. A configured mainnet client alone does not pass this check. |
| V04 — sourced versus verified identities | Correct allowlisted tokens/factories and discovered pools can pass identity checks. Empty code, zero discovery addresses, unexpected expected-pool values, and failed reads have distinct rejection/unavailable outcomes; none silently become zero-valued success. |
| V05 — token ordering and metadata | Validate numeric token ordering and reserve-to-token mapping. Reversed/unexpected tokens, wrong decimals, failed metadata calls, or a different factory fail verification; symbols cannot repair a mismatch. |
| V06 — V3 tier/spacing identity | Verify both selected fees, factory-enabled spacing, returned pool fee/spacing, and distinct pool identities. Disabled or mismatched fees/spacing reject that candidate; no replacement tier is selected. |
| V07 — structural liquidity | V2 zero reserves and V3 zero price/current liquidity or locked state fail screening. An old V2 reserve-update timestamp alone does not make a fresh block stale. Positive V3 liquidity remains a protocol quantity with finite-size suitability unavailable. |
| V08 — immutable read context | Advance the reported latest head during collection and verify all state reads/retries still use the original hash. Reject mixing values from different blocks, registry revisions, origins, or collection attempts. |
| V09 — canonicality and reorganization | A replacement hash at the selected number or unambiguous noncanonical response invalidates the attempt. Late results and a later return of the old hash cannot resurrect it. A new collection gets a distinct attempt identity. |
| V10 — unavailable validation | Timeouts, missing validation headers, or ambiguous provider errors remove current eligibility without claiming a confirmed reorganization. A later successful check may resolve unavailability only if other gates still pass; preserve the event history. |
| V11 — freshness boundaries | Check both sides of and equality at 30,000 ms block age, two-block lag, 5,000 ms validation age, and 2,000 ms future tolerance. Check explicit seconds/milliseconds conversion, signed future offset, clock rollback, and monotonic deadlines. |
| V12 — fresh validation requests | Prove final and renewed validation make fresh network requests, not cached or pre-collection shared responses. An expired validation check causes revalidation before use, never automatic freshness extension. |
| V13 — bounded transient retries | HTTP 429/5xx, network errors, and timeouts get at most one retry at the same hash. Count actual sends to catch nested library retries; enforce four in-flight requests, the per-request timeout, deadline, and Retry-After behavior. |
| V14 — terminal failures and cancellation | Wrong chain/configuration, authorization failure, unsupported methods, deterministic reverts, malformed data, missing pools, and identity/structural rejection do not get blind retries. Deadline/cancellation prevents late responses completing or changing another attempt. |
| V15 — completeness and eligibility | A fully received payload can still be rejected/stale/invalidated/validation-unavailable. One missing required pool/read keeps the selected workload unavailable; successful fragments and earlier records remain traceable without being presented as a complete result. |
| V16 — provenance and representation | Check chain/block/times, source/policy revisions, candidate/discovered identities, code hashes, token units, V3 quantities, per-read outcomes, and lifecycle links. Exact large integers survive the planned handoff encoding; no missing field becomes a fabricated amount. |
| V17 — origin and credentials | Fixture/historical records never become live observations. Inspect failure/report output for credential-bearing URLs/headers/keys; use nonsecret provider labels. A real RPC failure does not switch origin to fixtures. |
| V18 — staged qualification boundary | Verified identities plus positive structural screens permit only later qualification. Assert finite-size suitability is unavailable and full CR-02/three-pool analysis admission is not claimed by M1-03. Changing selected venues requires review. |

### Read-only live integration evidence

Run only with the user's explicit backend RPC configuration during approved M1-03 work. Record
actual chain/block provenance, source/configuration revisions, dependency versions, commands,
outcomes, and sanitized provider capability results. The planned gate requires:

1. A chain-ID-1 endpoint accepts both hash/canonical methods and handles unknown-hash probes as
   unavailable state, with all actual candidate reads bound to one recorded hash.
2. The selected factories discover the three candidate pools; on-chain identity/decimals/fees and
   structural evidence are recorded, including explicit rejection if a candidate fails. A failed
   candidate must not be replaced to manufacture a successful run.
3. Fresh post-validation matches that recorded block and yields the actual age/head-lag outcomes.
   Re-read the same block for deterministic protocol-state comparison where the provider can serve
   it; observation times and validation events remain separate from protocol state.
4. Demonstrate an unavailable/expired-use path honestly. A controlled reorganization is an offline
   response test; do not claim a real mainnet reorganization was exercised unless one was actually
   observed and recorded. Capability probes cannot prove a provider is always honest.

Missing RPC access, unsupported selectors, pruned state, or failed identity/admission is a reported
limitation/failure, not passed integration. The proposed M1-03 completion gate requires a usable
live registry/snapshot run; if it cannot run, keep that task incomplete or record an explicit user
scope revision. Offline success alone does not satisfy the proposed live gate. Even a successful
M1-03 run leaves finite-size liquidity qualification/full CR-02 evidence pending M1-04/05.

### Implementation handoff checks

Add meaningful checks to the approved packages and root check commands when M1-03 introduces
them. Preserve the passing foundation, use Bun and its lockfile, and report offline versus live
results separately. Inspect package dependencies and configuration to keep RPC out of domain and
browser code. Confirm no public CLI/API, storage, transaction/fork path, or second collector was
introduced. Record actual checks in M1-03's eventual task record; do not use this plan as evidence
that they have already passed.
