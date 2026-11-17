# M1-03: Registry verification and consistent snapshots

- State: Proposed
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md)
- Requirement IDs: CR-02 (identity/structural evidence only), CR-03, CR-09, CR-10; exact amounts
  and units under CR-01 in [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed M1-01/M1-02, accepted ADR-0005, explicit approval of this implementation scope,
  and a suitable user-configured RPC endpoint for the required live completion gate

## Outcome

A testable backend/protocol slice that discovers and verifies the selected Ethereum WETH/USDC
pool candidates, collects their state against one canonical block hash, and reports complete,
rejected, stale, invalidated, and unavailable outcomes with traceable provenance.

This is the first application implementation slice. It produces identity and structural liquidity
evidence for later quotation work. Finite-trade suitability remains explicitly unavailable; the
three-pool analysis workload is not admitted until M1-04/05 supply the required qualification.
M1-03 must not claim that its preliminary screens establish all of CR-02.

## Scope

If approved, implement the accepted ADR-0005 policy without changing its technical decisions.
The ADR owns candidate identities/fees, thresholds, defaults, consistency rules, and failure semantics.

| Deliverable | Bounded implementation |
| --- | --- |
| Working packages | Introduce the actual protocol and backend packages needed by this slice under ADR-0001. Configure exports, TypeScript checks, meaningful Vitest tests, and root verification commands for the code that exists. |
| Dependencies/configuration | Pin viem's accepted integration baseline; select a compatible Vitest version using current official sources. Preserve Bun and its lockfile. Add validated backend RPC/provider-label and policy configuration guidance, with credentials in ignored local environment files. |
| Candidate registry | Implement source-backed token/factory expectations, hash-bound factory discovery, code/metadata/token-order/fee/spacing verification, and structural V2/V3 screens. Preserve the configured three candidates and report failed admission honestly. |
| Pinned reader | Implement the strict block-hash/canonical selector boundary, required provider capability probes, bounded concurrency/retries/timeouts/deadline, fresh chain/header validation, and cancellation/late-response handling. |
| Collection and revalidation | Provide one-attempt orchestration and explicit validation/invalidation behavior. Keep block age, head lag, validation age, completeness, structural screening, and data origin distinct. No scheduler or always-running collector is required. |
| Evidence/handoff | Preserve the semantic provenance and exact quantities required by ADR-0005, with sanitized failure details and nonsecret provider labels. Supply traceable observation/lifecycle results to future quotation/storage work without implementing those consumers. |
| Validation and guidance | Implement the applicable V01–V18 checks and read-only live gate from the linked validation plan. Document actual commands, configuration, observed evidence, failures, and limitations. |

Keep RPC and external I/O in protocol/backend modules. Pass clocks and external state explicitly
to policy logic so failures and time boundaries can be tested. Root checks must cover the new
packages; the M1-01 scripts-only type-check cannot stand in for application verification.

The live gate may make read-only RPC calls to the explicitly configured endpoint once this task
is approved. The user selected Alchemy for the initial Ethereum workload and reports configuring
an endpoint; its chain/capabilities and availability are still unverified. Do not record credentials in
chat, reports, fixtures, or logs; configuration instructions should use the ignored backend
environment file. Check current official APIs again during implementation, especially the pinned
viem release's behavior with the existing Node.js/TypeScript toolchain.

## Outside scope

- V2/V3 quotation adapters, official-quoter integration, cycle/profit calculations, price-impact
  admission budgets, and finite-size workload qualification (M1-04/05).
- A public market-data CLI, HTTP API, SSE, UI, or background startup/shutdown workflow (M1-06/11/12).
- SQLite drivers, schemas, migrations, or an application evidence store (M1-09/10). Integration
  reports linked from task evidence do not constitute a persistent application database.
- Full V3 tick traversal, aggregation/failover redesign, additional chains/tokens/venues, contracts,
  fork execution, transaction submission, benchmarks, deployment, and CI/CD.
- Placeholder packages unrelated to this slice. No domain or frontend package is needed merely to
  populate the target directory layout.
- Commits. Only the user creates commits; no push is authorized.

## Decisions and remaining dependencies

ADR-0005 was accepted on 2026-11-17, including its strict consistency policy and staged admission
boundary. Do not ask for that same design acceptance again within this scope.

On 2026-11-17 the user selected a single Alchemy Ethereum endpoint for now and requested future
support for multiple providers, fallback, and additional chains. This keeps M1-03 within ADR-0005's
single-provider Ethereum scope. The endpoint value was not inspected or copied into documentation;
its configuration is user-reported until the approved live checks run.

Use the selected RPC/module boundary so later work can replace or extend provider
configuration. Future resilience and chain expansion are tracked in the backlog; do not add a
provider-fallback system or a generic multi-chain framework to this task.

The user accepted keeping RPC access in a distinct module inside the backend for M1-03. RPC-01
will evaluate extracting that boundary into a separate blockchain gateway process for shared
consumers and independent operation. No gateway process, service API, or additional application
process is part of this task; ADR-0004's initial topology remains in effect.

Actual pool addresses, provider capability/availability, observed liquidity, and runtime compatibility
remain unverified until the approved work produces evidence. A missing RPC endpoint does not prevent
useful offline implementation/verification, but it prevents satisfying the proposed live completion
gate. Unsupported consistency capabilities require an explicit failure; they do not authorize a
weaker fallback. A material departure from ADR-0005 needs a reviewed design change.

## Acceptance criteria

- [x] The user has accepted the governing design in ADR-0005.
- [ ] The user has explicitly approved this bounded implementation scope.
- [ ] The necessary packages install reproducibly with Bun and its lockfile, and documented
  verification commands cover the actual application code and preserve the foundation checks.
- [ ] Source-backed candidates are discovered/verified at a recorded block hash; incorrect or
  unavailable chain/contract/token/pool/liquidity evidence produces the accepted explicit outcomes.
- [ ] Every state read and retry carries the required hash/canonical selector, and fresh
  post-validation, temporal gates, invalidation, and unavailable-validation behavior are demonstrated.
- [ ] Actual request counts/concurrency/cancellation behavior satisfy the accepted operational limits;
  missing results and failed reads never become fabricated zero-valued successes.
- [ ] Meaningful offline checks cover V01–V18 in the existing validation plan, including boundary
  values, rejected/partial observations, reorganization responses, origin, and credential sanitization.
- [ ] The required read-only live gate records a usable registry/snapshot run and honest unavailable/
  expired-use evidence with real provenance. Missing/failed required integration keeps the task
  incomplete unless the user explicitly revises its scope; fixtures cannot count as live evidence.
- [ ] Observation and lifecycle information preserve exact quantities/units, source/policy revisions,
  times, read outcomes, and the distinction between structural screens and finite-size suitability.
- [ ] The handoff reports structural evidence only, with finite-size suitability/full CR-02 evidence
  still pending M1-04/05; no pool substitution or premature workload admission is hidden.
- [ ] Actual commands/results and limitations are recorded here, setup guidance is usable, and the
  backlog/current state are updated without starting another task.

## Planned validation

Use the canonical [M1-03 validation plan in M1-02](M1-02-registry-and-consistent-snapshots.md#m1-03-validation-plan)
for expected offline and live outcomes; do not copy its matrix into competing test specifications.
Add meaningful tests to the approved packages, then run the documented root/package checks and
frozen-lockfile installation. Inspect request selectors and retry counts through the actual
transport boundary, using controlled responses and clocks for offline failure cases.

Run the live integration gate only in its explicit mode against the user's configured read-only
endpoint. Record actual block/chain identities, observations, capability checks, validation results,
and sanitized evidence. Keep live, historical, and fixture origins clear. Do not claim a controlled
mainnet reorganization test from an offline response scenario.

Review the resulting dependency boundaries and changed-file scope. Record passed, failed, skipped,
and unavailable checks separately. Application testing alone is not formal verification or proof
that an apparent opportunity could have been captured.

## Approval record

- Review preparation: Prepared after ADR-0005 acceptance as the concrete next implementation scope.
  This task record does not manufacture implementation approval.
- Design acceptance: Granted on 2026-11-17 when the user said “i accept adr5”; recorded in ADR-0005.
- Implementation approval: Not granted.
- Approved implementation scope and user instruction: None recorded.

The user's endpoint/future-direction clarification supplies configuration context, not approval to
implement this task. M1-03 remains Proposed while the user reviews it.

On 2026-11-17 the user replied “ok” to the recommendation to isolate RPC access inside the backend
now and evaluate a separate gateway process in RPC-01. This accepts the direction described above;
it does not approve M1-03 implementation or a future gateway implementation.

## Evidence and handoff

Implementation has not started. This Proposed task record is ready for user review. No application
code, package/dependency changes, tests, live RPC calls, commits, or pushes were performed to prepare it.

Preparation checks passed on 2026-11-17: local links/anchors, whitespace, and CR references across
29 Markdown files; `git diff --check`; accepted-design/proposed-task approval states; and confirmation
that changes are documentation-only with foundation files and Git HEAD unchanged. These checks
validate this review artifact, not M1-03 application behavior or integration.

Provider clarification recorded on 2026-11-17: Alchemy is the selected initial provider; future
multi-provider fallback and additional chains are recorded in product/roadmap/backlog documentation.
No endpoint value was read, disclosed, changed, or tested, and no implementation approval was added.
Clarification checks passed: links/anchors, whitespace, and CR IDs in 29 Markdown files;
`git diff --check`; unique RPC-01/RPC-02/CHAIN-01 backlog entries; and M1-03's unchanged Proposed/
unapproved state. Exactly six Markdown files changed; foundation files and Git HEAD `172a81c`
are unchanged. These are documentation checks, not endpoint capability or integration evidence.

Gateway-direction clarification recorded on 2026-11-17: the current boundary is an internal RPC
module; future process extraction is a design question for RPC-01. Product, roadmap, backlog,
and current state reflect that direction. No implementation or approval state was advanced.
Links/anchors, whitespace, and CR checks passed across 29 Markdown files; `git diff --check`
passed. M1-03 remains Proposed with implementation unapproved; cumulative changes remain six
documentation files and Git HEAD `172a81c` is unchanged.

The next action is user approval or amendment of this scope. Only then implement M1-03 and record
its actual verification evidence here. Completion does not authorize another task.
