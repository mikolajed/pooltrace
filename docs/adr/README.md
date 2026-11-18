# Architecture Decision Records

ADRs capture why Pooltrace makes an architectural choice, including reasonable alternatives and
their tradeoffs. They are part of development, not retrospective justification.

## Approval and lifecycle

1. Copy [TEMPLATE.md](TEMPLATE.md) to the next numbered record before a significant change.
2. Keep the record **Proposed** while the user reviews the decision.
3. Record **Accepted** only after explicit user acceptance, with the date and approval context.
4. Follow the [development workflow](../WORKFLOW.md) for implementation authorization. Keep that
   authorization in the related task record. A design may be accepted while its task is proposed.
5. After approved work, link the implementation and record actual validation evidence. Acceptance
   is not a claim that code exists or tests passed.
6. Use **Rejected** for a considered decision the user declines. Use **Superseded** and link a new
   ADR when an accepted decision changes. Do not silently rewrite accepted history.

An ADR is appropriate for package/runtime choices, project boundaries, snapshot policy, quotation
and profit semantics, evidence storage, execution trust boundaries, and frontend transport.
Small refactors within an accepted design need no separate ADR.

## Decision index

| ID | Decision | Status | Related task |
| --- | --- | --- | --- |
| [0001](0001-project-boundaries-and-tooling.md) | Project boundaries and tooling | Accepted: design only | [M1-01](../tasks/M1-01-tooling-and-workspaces.md) |
| [0002](0002-typescript-first-and-measured-evolution.md) | TypeScript first and measured backend evolution | Accepted: direction only | [SET-10 documentation](../tasks/SET-10-language-evolution-and-benchmarks.md); future EVO/BENCH work in backlog |
| [0003](0003-sqlite-first-and-storage-evolution.md) | SQLite first and storage evolution | Accepted; timing/ownership refined by 0004 | [SET-11 documentation](../tasks/SET-11-storage-evolution.md); M1/M3 and future STORE/BENCH work |
| [0004](0004-local-processes-and-gated-deployment.md) | Local processes, early SQLite, and gated deployment | Accepted: architecture/release direction only | [SET-12 documentation](../tasks/SET-12-local-architecture-and-deployment.md); M1/M2 and future DEP work |
| [0005](0005-registry-verification-and-consistent-snapshots.md) | Registry verification and consistent snapshots | Accepted | [M1-02](../tasks/M1-02-registry-and-consistent-snapshots.md); completed [M1-03 implementation](../tasks/M1-03-registry-and-consistent-snapshots.md) |
| [0006](0006-quotation-cycles-and-profitability.md) | Quotations, finite-size admission, and cycle profitability | Accepted | [M1-04 design](../tasks/M1-04-quotation-cycles-and-profitability-design.md); completed [M1-05 implementation](../tasks/M1-05-quotation-and-cycle-analysis.md) |
| [0007](0007-minimal-sqlite-evidence-store.md) | Minimal SQLite evidence store | Accepted | Completed [M1-09 design](../tasks/M1-09-minimal-sqlite-design.md) and [M1-10 implementation](../tasks/M1-10-minimal-evidence-store.md#implementation-evidence) |
| [0008](0008-local-api-sse-and-process-interface.md) | Local API, SSE, and application process interface | Accepted | Completed [M1-11](../tasks/M1-11-local-api-sse-and-browser.md#implementation-evidence) / [M1-12](../tasks/M1-12-local-startup-readiness-and-shutdown.md#implementation-evidence) |
| [0009](0009-pr-verification-and-repository-trust.md) | PR verification and repository trust boundaries | Accepted | [DEP-02](../tasks/DEP-02-pr-verification-and-cloud-compatibility.md) / [CONTRIB-01](../tasks/CONTRIB-01-shared-pr-contributor-setup.md); DEP-02 implementation in progress; CONTRIB-01 setup pending |

Link requirements from [CORRECTNESS.md](../CORRECTNESS.md) where applicable. An ADR explains how
to meet them; it does not change them or establish implementation evidence by itself.

## Upcoming decision topics

These are topics to investigate, not preaccepted designs:

- Executor router interfaces, security properties, and fork execution/cost accounting.
- Broader backup/restore, schema evolution, and replay beyond the accepted minimal ADR-0007
  design remain M3/future work under ADR-0003/0004; the minimal store is implemented in M1-10.
- Terminal read path, SSE updates/reconnect, and frontend state semantics.
- Brand asset production and terminal visual conventions.
- Concrete Rust migration boundaries and Python research integration under ADR-0002; the selected
  direction does not preaccept those future designs.
- ADR-0008's minimal M1 UI/backend API, SSE and process lifecycle are implemented. ADR-0009 now
  selects PR verification and repository trust boundaries; DEP-02 is in progress. Anvil orchestration
  and hosted release design remain separate. The CI candidate is locally validated; hosted activation and production deployment remain incomplete.
