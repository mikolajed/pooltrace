# 0004: Local application processes, early SQLite, and gated deployment

- Status: Accepted
- Proposed on: 2026-11-17
- Decision accepted by user: 2026-11-17; local architecture, early persistence, and future release direction
- Related documentation task: [SET-12](../tasks/SET-12-local-architecture-and-deployment.md)
- Related implementation work: M1, M2, M3, M4, and future DEP items in [BACKLOG.md](../BACKLOG.md)
- Requirement IDs: CR-01 through CR-11 in [CORRECTNESS.md](../CORRECTNESS.md)
- Supersedes: Persistence timing and write ownership in [ADR-0003](0003-sqlite-first-and-storage-evolution.md)
- Superseded by: None

> Subsequent decision, 2026-11-17: the user accepted ADR-0001's workspace boundaries and Node.js
> runtime with Bun tooling. Pending-design references below describe the state at this ADR's
> acceptance. M1-01 was subsequently approved and completed; its task record owns scope and evidence.

## Context

The user clarified that the initial system should run on localhost and asked about separating UI,
analysis, SQLite, and Anvil. The user accepted documenting two application processes, SQLite in the
first working backend, and a separate Anvil process when fork execution is introduced.

The user also wants future CI/CD and a deployment pipeline that validates changes before production
servers are modified. That is a future design requirement, not authorization to configure CI or host
the application now. Runtime and release capabilities can evolve through subsequent milestones.

## Decision

Use two local application processes for the first working application:

1. **UI application:** serves the browser terminal. Browser code handles presentation, interaction,
   filtering, and charts. It consumes backend results rather than owning market collection or the
   authoritative profitability calculations.
2. **TypeScript backend:** owns collection, RPC access, snapshot verification, quotation/cycle
   analysis, persistence, API, and SSE updates. These are separate modules within one application
   process, not separate services initially.

Keep a minimal SQLite evidence store in the first working backend milestone. The backend owns all
application database access; the UI reads records through the API. SQLite is embedded and does not
add a database-server process. Persist observations and calculated results with provenance, then
add simulation records when execution exists. Domain logic remains independent of the database.

This moves basic persistence from M3 into M1. M3 becomes evidence-store hardening, richer replay/query
support, and recovery work. A basic reviewed schema/driver/migration design is required in M1 before
storage implementation. SQLite selection and future storage candidates from ADR-0003 remain valid.

Introduce **Anvil as a separate local process in M2**, alongside the executor/fork milestone.
Design its boundary early without requiring a running fork for quotations or UI use. The backend
coordinates on-demand fork jobs against recorded state, initially one job at a time. Simulation
availability and failures are explicit, and M2 transaction execution remains on local forks.

Provide a simple local start/stop workflow for the two applications when implemented. Ports and
endpoints are configurable; no particular ports are selected by this ADR. Keep the CLI requirement
as a diagnostic entry point over the same backend behavior, without introducing another independent
collector or calculation authority.

For later hosted environments, require checks and staging validation before a separately authorized
production change. Keep artifact identity, migration compatibility, health checks, and recovery/
rollback in the release design. [DEPLOYMENT.md](../DEPLOYMENT.md) owns the draft environment and
pipeline plan; provider, CI service, packaging, commands, rollout strategy, and detailed gates remain
future decisions.

## Alternatives considered

- **Browser-only live collection:** was discussed, but the agreed local backend owns collection and
  authoritative results. Browser and localhost are different execution boundaries.
- **One combined UI/backend application process:** can work, but separate application processes keep
  UI refresh/restart behavior apart from collection and make the backend replacement boundary clear.
- **Separate collector, analysis, RPC, and API services immediately:** adds coordination and failure
  boundaries before the initial workload demonstrates a need for them.
- **Persistence only in M3:** postpones the evidence needed for history, reproducibility, and later
  comparison. A minimal early store supports the project's core purpose.
- **Always-running Anvil from M1:** is not needed for read-only quoting and would make the first slice
  depend on fork machinery before execution is implemented.

## Consequences

The first working milestone includes more than the earlier CLI-only plan: minimal browser access
and persistence accompany the backend. Keep these narrow; terminal refinement remains in M4.
Two local applications need startup, readiness, and shutdown handling. Fork process lifecycle and
serialized jobs need explicit validation in M2. SQLite schema details and the Node/Bun worker runtime
are still open and do not gain implementation approval through this decision.

The boundaries support later Rust/backend or storage changes without requiring them. Future hosted
production means hosting the research application, not authorizing live trading.

## Acceptance and validation criteria

- One backend owns collection, analysis, database writes, and API results; browser/UI restart does
  not restart the collector or create a second source of results.
- M1 persists exact amounts and observation/result provenance with reviewed minimal migrations.
- The UI receives persisted results/status through the backend API and SSE; persistence failures
  are explicit and are not presented as successfully stored observations.
- Quotations work without Anvil. M2 adds on-demand isolated fork execution with one active job,
  pinned state, controlled process ownership, and explicit outcomes.
- Future production changes follow the release plan and explicit approval process. No CI workflow,
  deployment, runtime process, or database is created by this documentation task.

## Approval record

After the localhost architecture recommendation, the user said “ok, update docs.” This accepts the
described architecture and documentation update. It does not approve implementation, settle the
exact workspace/runtime, create a production environment, or authorize deployment/pipeline setup.

## Implementation and evidence

Documentation only; see SET-12. ADR-0001 remains proposed for exact layout/runtime details.
The earlier persistence timing is preserved as history in ADR-0003 with a link to this refinement.
No application, SQLite file, Anvil process, CI run, or deployment exists yet.
