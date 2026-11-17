# Backlog

This is the work inventory, not implementation authorization. Unchecked items are unfinished.
Use the [workflow](WORKFLOW.md) before coding. When work approaches implementation, create a task
from [the template](tasks/TEMPLATE.md); keep its scope, approval, and evidence in that record.
The checkbox here summarizes completion, not approval. Requirement IDs refer to
[CORRECTNESS.md](CORRECTNESS.md).

The [roadmap](ROADMAP.md) defines revisable milestones for an ongoing product. Scope and any time
estimates belong to individual milestones, not to a fixed project lifespan or feature ceiling.

## Setup

- [x] SET-01: Inspect the empty repository and preserve existing work.
- [x] SET-02: Record the setup-only boundary and explicit development approval in `AGENTS.md`.
- [x] SET-03: Capture product scope and correctness requirements.
- [x] SET-04: Add ADR workflow, template, index, and a proposed initial architecture decision.
- [x] SET-05: Add a milestone plan and implementation acceptance criteria.
- [x] SET-06: Preserve the supplied logo preview and register its production work below.
- [x] SET-07: User review of the setup and proposed first development scope.
  Design acceptance and M1-01 approval are recorded in the linked foundation task below.
- [x] [SET-08: Documentation responsibilities and work records](tasks/SET-08-documentation-system.md).
  Documentation-only reorganization completed; validation evidence is in the linked record.
- [x] SET-09: Clarify ongoing development and milestone planning.
- [x] [SET-10: TypeScript-first direction and migration benchmarking](tasks/SET-10-language-evolution-and-benchmarks.md).
  Documentation-only work completed; validation evidence is in the linked record.
- [x] [SET-11: SQLite-first storage and future options](tasks/SET-11-storage-evolution.md).
  Documentation-only work completed; validation evidence is in the linked record.
- [x] [SET-12: Local architecture and future deployment gates](tasks/SET-12-local-architecture-and-deployment.md).
  Documentation-only work completed; validation evidence is in the linked record.
- [x] [SET-13: Product framing and milestone scope](tasks/SET-13-product-framing-and-milestone-scope.md).
  Documentation-only work completed; validation evidence is in the linked record.

## M1 — local read-only research application; M1-01 approved only

[ADR-0004](adr/0004-local-processes-and-gated-deployment.md) brings minimal SQLite and browser
access into this milestone. Each task remains separately scoped; only M1-01 is approved for implementation.

- [x] [M1-01: Tooling and workspace foundation](tasks/M1-01-tooling-and-workspaces.md).
  State: Done. Scope, approvals, criteria, and evidence are maintained in the linked record.
- [x] [M1-02: Registry and consistent-snapshot design](tasks/M1-02-registry-and-consistent-snapshots.md).
  State: Done. Scope, approvals, criteria, and evidence are maintained in the linked record;
  ADR-0005 is Accepted; implementation authorization remains separately scoped.
- [ ] [M1-03: Registry verification and consistent snapshots](tasks/M1-03-registry-and-consistent-snapshots.md).
  State: Proposed. Scope, approvals, criteria, and evidence are maintained in the linked record.
- [ ] M1-04: Propose quotation, cycle evaluation, and profitability semantics ADR.
  Acceptance: a reviewable design addressing CR-01 and CR-04 through CR-06.
- [ ] M1-05: Implement the approved V2/V3 adapters and cycle analysis.
  Acceptance: evidence of protocol comparison, correct composition, and all configured route/size
  evaluations under CR-04 and CR-05.
- [ ] M1-06: Add the runnable CLI and configuration documentation.
  Acceptance: documented real-data and explicit fixture modes, `.env.example`, and states satisfying
  CR-06, CR-09, and CR-11. Use shared backend behavior/API without starting a duplicate collector.
- [ ] M1-07: Validate arithmetic, token ordering, rounding, composition, and snapshot failures.
  Acceptance: meaningful checks for CR-01 through CR-05 and evidence reporting under CR-10.
- [ ] M1-08: Document mathematics, assumptions, commands, and actual milestone evidence.
  Acceptance: a reviewer can reproduce the approved slice and understand what remains unverified.
- [ ] M1-09: Propose the minimal SQLite driver/schema/migration design for the first backend slice.
  Acceptance: backend ownership, exact amount encoding, observation/result provenance, write/read
  boundaries, persistence failures, and minimal versioned migrations under ADR-0004 are explicit.
- [ ] M1-10: Implement the approved minimal evidence store alongside collection/analysis.
  Acceptance: observations/quotes/cycles and failure/invalidation evidence survive restart, exact
  values round-trip, and storage success is reported only after a successful commit.
- [ ] M1-11: Add the approved local API, SSE updates, and minimal read-only browser view.
  Acceptance: UI reads backend-owned results/history, displays provenance/age/unavailable states,
  and can reconnect/refresh without restarting collection. Rich terminal work remains in M4.
- [ ] M1-12: Add the approved local application startup/readiness/shutdown workflow.
  Acceptance: one command starts UI/backend, individual commands remain usable, failures are clear,
  and shutdown touches only owned processes. Quotations do not require Anvil.

## M2 — executor and local forks; approval pending

- [ ] M2-01: Propose executor trust-boundary and fork/cost-accounting ADRs.
- [ ] M2-02: Build the approved single-owner, prefunded executor.
  Acceptance: executor properties and balance accounting satisfy CR-07.
- [ ] M2-03: Add meaningful unit, fuzz, invariant, and fork tests.
  Acceptance: success/rollback and security evidence satisfying CR-07, CR-08, and CR-10.
- [ ] M2-04: Validate selected routes on local mainnet forks at recorded state.
  Acceptance: quoted-versus-executed outputs and full receipt/cost evidence under CR-06, CR-08,
  and CR-09, without a historical capture claim.
- [ ] M2-05: Implement the approved on-demand Anvil process/job lifecycle.
  Acceptance: separate local fork process, verified state/endpoint, one active job initially,
  isolated/reset state, timeouts/cancellation/cleanup, and persisted simulation/rejection evidence.

## M3 — evidence and recovery hardening; implementation approval pending

Basic persistence is now M1-09/10 under ADR-0004. These existing M3 IDs are retained with their
scope refined to extend the store rather than introduce it.

- [ ] M3-01: Propose evidence-store hardening, history/replay, schema evolution, and recovery design.
  Acceptance: export/replay completeness, exact-value/provenance preservation, migrations,
  backup/restore, and failure recovery build on M1's reviewed store under ADR-0003/0004.
- [ ] M3-02: Implement the approved evidence/history/replay and recovery improvements.
  Acceptance: reproducible historical results, richer queries, verified schema evolution and
  restore/recovery, and durable evidence satisfying CR-01, CR-03, and CR-09.

## M4 — terminal and brand; approval pending

- [ ] M4-01: Propose terminal architecture, SSE lifecycle, and presentation-state ADR.
- [ ] M4-02: Refine the minimal M1 interface into the approved Next.js research terminal.
  Acceptance: the priorities in [PRODUCT.md](PRODUCT.md) with evidence/status presentation satisfying
  CR-09 and CR-11.
- [ ] BR-01: Review and produce the perched kingfisher brand assets from the supplied preview.
  Acceptance: reviewed production asset set and source/palette record following
  [the brand reference](brand/README.md).
- [ ] BR-02: Integrate approved assets and check readability/accessibility.
  Acceptance: approved brand assets, product readability requirements, and CR-11 are preserved.

## M5 — documentation and reproducibility; approval pending

- [ ] M5-01: Write reproducible setup and architecture/mathematics/security explanations.
- [ ] M5-02: Prepare reproducible examples and contributor guidance with assumptions and limitations.
- [ ] M5-03: Validate milestone acceptance and document passed, failed, skipped, and unverified checks.

## Planning checkpoints

- [ ] PLAN-01: Review progress at milestone boundaries and propose the next increment.
  Acceptance: summarize working behavior, verification evidence, unfinished work, and priorities;
  obtain approval for the next implementation scope. Each review feeds continued product development.

## Future milestone candidates

### Backend evolution and comparison

Language direction is accepted in [ADR-0002](adr/0002-typescript-first-and-measured-evolution.md).
These are future implementation/research tasks, not authorization to start them. Rust/Python roles
are candidates; concrete architecture and methodology need review.

- [ ] EVO-01: Prepare versioned evidence/export contracts and reference cases for backend migration.
  Acceptance: exact units, provenance, result/error states, and independently checked reference
  behavior are reproducible. Scope this when an approved working TS slice exists.
- [ ] BENCH-01: Establish a reproducible TypeScript benchmark baseline before replacement.
  Acceptance: an approved workload/methodology under [BENCHMARKING.md](BENCHMARKING.md), exact source
  and environment records, correctness checks, repeated measurements, and raw evidence.
- [ ] EVO-02: Propose a concrete Rust backend migration ADR and bounded implementation tasks.
  Acceptance: component ownership, API/evidence compatibility, arithmetic semantics, transition and
  rollback strategy, benchmark questions, and expected maintenance/operational tradeoffs are explicit.
- [ ] EVO-03: Implement an approved Rust migration increment and validate it against the TS reference.
  Acceptance: equivalent inputs/state, accounted-for discrepancies, and correctness parity before
  any change in authoritative implementation.
- [ ] BENCH-02: Benchmark the replacement or combined architecture against the preserved TS baseline.
  Acceptance: controlled computation/replay/fork/API comparisons as applicable, separate live RPC
  observations, variability/errors, full process overhead, and an honest adoption report.
- [ ] EVO-04: Propose Python research tooling for a concrete historical or statistical analysis task.
  Acceptance: a versioned dataset, defined research output, and explicit separation from authoritative
  live calculations; implementation and any additional benchmarks need their own approval.

### Storage evolution and comparison

[ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) selects SQLite initially and records the
other candidates. Each item below is future evaluation or implementation work requiring its own
approved scope. Data-store roles may complement each other; there is no mandatory upgrade order.

- [ ] STORE-01: Assess actual SQLite workloads and propose concrete storage adoption criteria.
  Acceptance: recorded ingestion/read patterns, concurrency, data growth, durability/recovery needs,
  and a bounded proposal linked to the evidence contracts from EVO-01.
- [ ] STORE-02: Evaluate PostgreSQL as an operational-store replacement when justified.
  Acceptance: migration design, exact-value/result parity, cutover/rollback, and an adoption report.
- [ ] STORE-03: Evaluate ClickHouse for historical analytics when justified.
  Acceptance: defined analytical workload, source-of-truth/freshness rules, reproducible ingestion,
  query-result validation, and a measured benefit/cost comparison.
- [ ] STORE-04: Evaluate versioned Parquet datasets for research and replay.
  Acceptance: declared units/encoding, exact-value round trips, schema/manifests, integrity checks,
  and reader/writer compatibility before publishing analytical results.
- [ ] STORE-05: Evaluate bucket/object storage for datasets and larger evidence artifacts.
  Acceptance: defined artifacts/access/retention needs, integrity and retrieval/restore checks,
  provider selection only when approved, and measured storage/request/transfer costs.
- [ ] BENCH-03: Compare proposed storage changes with the preserved SQLite baseline.
  Acceptance: equivalent data/queries and stated durability/concurrency guarantees, isolated storage
  effects where possible, resource/space/network measurements, and recovery/migration evidence.

### Future deployment and CI/CD

The local architecture is accepted in [ADR-0004](adr/0004-local-processes-and-gated-deployment.md).
[DEPLOYMENT.md](DEPLOYMENT.md) records the draft future pipeline; no workflow, host, or production
environment is configured. Passing checks does not grant deployment authorization.

- [ ] DEP-01: Propose hosting, packaging, environment boundaries, and process/data lifecycle ADR.
  Acceptance: UI/backend artifacts, collector ownership, persistent data, optional native fork
  workload, configuration, staging isolation, and production recovery requirements are explicit.
- [ ] DEP-02: Implement separately approved CI checks/build artifact generation.
  Acceptance: required checks are defined by change type, unrun required checks block promotion,
  dependency/toolchain inputs and artifact identity are recorded, and no production update occurs.
- [ ] DEP-03: Implement separately approved staging validation and migration rehearsal.
  Acceptance: the exact candidate passes applicable API/UI/SSE/collector/fork checks, schema-upgrade
  and recovery checks use isolated data, and evidence identifies candidate/configuration versions.
- [ ] DEP-04: Implement separately approved production promotion/approval and health/recovery gates.
  Acceptance: explicit candidate-bound authorization before changes, serialized rollout, compatible
  migrations, persistent evidence, health checks, and a verified recovery/rollback procedure.
- [ ] DEP-05: Document and rehearse the release/restore procedure before first production rollout.
  Acceptance: recorded preconditions, required results, backup/restore/replay limits, artifact/schema
  compatibility, failure handling, and auditable outcome; production execution needs separate approval.

### RPC resilience and chain expansion

The user selected Alchemy for the initial Ethereum workload and requested multi-provider fallback
and additional chains as future development. The current M1-03 scope stays single-provider and
Ethereum-only under ADR-0005; these items do not authorize implementation now.

- [ ] RPC-01: Propose multi-provider capability, health, and fallback policy.
  Acceptance: provider selection/switching, bounded retries and rate limits, chain/block consistency,
  disagreement handling, provenance, and observable failure/recovery behavior are explicit.
  Evaluate extracting the internal RPC module into a separate blockchain gateway process,
  including shared consumers, request semantics, deadlines, lifecycle, and operational tradeoffs.
- [ ] RPC-02: Implement a separately approved provider-resilience increment.
  Acceptance: meaningful failure/recovery checks demonstrate the approved fallback policy without
  mixing chain/state or hiding unavailable/inconsistent provider responses.
- [ ] CHAIN-01: Scope and design an additional-chain increment before its implementation.
  Acceptance: select the chain and workload, verify deployments/provider capabilities, and define
  chain-specific consistency, provenance, and validation requirements. Do not assume one chain's
  RPC or protocol behavior applies to every later chain.

### Feature expansion

- Additional protocol adapters, including Curve; additional-chain design is tracked in CHAIN-01.
- Cross-chain inventory analysis, flash loans, and Starknet.
- Live trading and its separate security/execution design.
- Formal proofs, if separately scoped and justified.
