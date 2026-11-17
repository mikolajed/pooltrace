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
| [0001](0001-project-boundaries-and-tooling.md) | Project boundaries and tooling | Proposed | [M1-01](../tasks/M1-01-tooling-and-workspaces.md) |
| [0002](0002-typescript-first-and-measured-evolution.md) | TypeScript first and measured backend evolution | Accepted: direction only | [SET-10 documentation](../tasks/SET-10-language-evolution-and-benchmarks.md); future EVO/BENCH work in backlog |
| [0003](0003-sqlite-first-and-storage-evolution.md) | SQLite first and storage evolution | Accepted; timing/ownership refined by 0004 | [SET-11 documentation](../tasks/SET-11-storage-evolution.md); M1/M3 and future STORE/BENCH work |
| [0004](0004-local-processes-and-gated-deployment.md) | Local processes, early SQLite, and gated deployment | Accepted: architecture/release direction only | [SET-12 documentation](../tasks/SET-12-local-architecture-and-deployment.md); M1/M2 and future DEP work |

Link requirements from [CORRECTNESS.md](../CORRECTNESS.md) where applicable. An ADR explains how
to meet them; it does not change them or establish implementation evidence by itself.

## Upcoming decision topics

These are topics to investigate, not preaccepted designs:

- Pool registry verification, same-block reads, freshness, and reorg invalidation.
- Integer quotation, cycle composition, size selection, and unavailable cost semantics.
- Executor router interfaces, security properties, and fork execution/cost accounting.
- SQLite driver/schema, provenance, writer ownership, migrations, backup/restore, and replay under
  ADR-0003/0004; backend ownership is selected, while the exact driver/schema/lifecycle remain open.
- Terminal read path, SSE updates/reconnect, and frontend state semantics.
- Brand asset production and terminal visual conventions.
- Concrete Rust migration boundaries and Python research integration under ADR-0002; the selected
  direction does not preaccept those future designs.
- Concrete UI/backend API and process lifecycle, Anvil orchestration, and future hosting/CI/CD gates
  under ADR-0004. No CI platform or production deployment is configured.
