# Documentation map

Each document owns one kind of information. Link to its canonical source instead of copying rules
across agent instructions, task plans, and ADRs.

## Sources of truth

| File | Owns | Update when |
| --- | --- | --- |
| [../README.md](../README.md) | Public introduction and navigation | The project's entry points change |
| [../AGENTS.md](../AGENTS.md) | Short agent entry point and approval guardrail | Agent navigation changes |
| [PRODUCT.md](PRODUCT.md) | Product purpose, ongoing vision, milestone workloads, interface priorities | The user changes product direction or milestone scope |
| [CORRECTNESS.md](CORRECTNESS.md) | Stable financial, state, execution, and evidence requirements | A requirement is clarified or explicitly changed |
| [ANALYSIS.md](ANALYSIS.md) | Explanation of implemented read-only calculations, assumptions, worked examples, result interpretation, and evidence reading paths | Implemented behavior or the reader's interpretation path changes |
| [ENGINEERING.md](ENGINEERING.md) | Selected tools and engineering conventions | An approved tooling/convention choice changes |
| [BENCHMARKING.md](BENCHMARKING.md) | Backend/storage benchmark methodology and reporting requirements; actual runs belong in task evidence | A comparison is scoped or its methodology changes |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Local process lifecycle, future environments, and draft release gates | Runtime or release/deployment requirements change |
| [WORKFLOW.md](WORKFLOW.md) | Authorization, work lifecycle, and handoff rules | The user changes the development process |
| [STATUS.md](STATUS.md) | Concise current state and next proposed action | A work session changes the project state |
| [ROADMAP.md](ROADMAP.md) | Milestone sequence, dependencies, and continued development | Milestone scope or sequencing changes |
| [BACKLOG.md](BACKLOG.md) | Work inventory, stable task IDs, and links to detailed tasks | Tasks are added, refined, or change state |
| [tasks/](tasks/TEMPLATE.md) | Individual task scope, approval record, criteria, and evidence | A task is prepared, approved, worked, or completed |
| [adr/](adr/README.md) | Architectural choices, alternatives, and rationale | A significant design decision is proposed or changed |
| [brand/](brand/README.md) | Supplied visual reference and asset constraints | Brand assets are reviewed or produced |

## Reading paths

- **Understand the project:** product → correctness → roadmap.
- **Use and understand the working slice:** root README setup/commands → analysis guide → linked
  source/ADRs for details and task records for actual evidence.
- **Start or resume work:** agent entry point → current state → workflow → relevant task and ADRs.
- **Review a design:** task scope → linked requirements → proposed ADR and alternatives.
- **Verify a result:** task evidence → actual artifacts and check output. A checked box alone is
  insufficient evidence of correctness.
- **Work on the terminal or logo:** product interface priorities → brand reference → relevant task.
- **Plan a backend migration:** ADR-0002 → benchmark methodology → the relevant EVO/BENCH tasks and
  later migration ADR. The language direction is accepted; implementation remains separately gated.
- **Plan storage changes:** ADR-0003 → ADR-0004 for early persistence timing/ownership →
  [Accepted ADR-0007](adr/0007-minimal-sqlite-evidence-store.md) and M1-09 evidence →
  [Proposed M1-10 scope](tasks/M1-10-minimal-evidence-store.md), M3/STORE tasks → storage benchmark
  methodology. No store is implemented; future stores/formats remain open.
- **Plan runtime or deployment:** ADR-0004 → deployment plan → relevant M1/M2 or future DEP tasks.
  Local architecture is selected; pipeline/hosting implementation is not authorized.

## Consistency rules

- The user's explicit instructions and approvals govern. No document written by an agent can
  manufacture approval or silently override a user requirement.
- Requirements describe what must hold. ADRs explain how to satisfy them; they cannot waive them.
- The analysis guide explains implemented behavior and examples; it does not replace requirements,
  accepted decisions, README command ownership, or task evidence.
- A proposed ADR describes a possible design. It is not a description of implemented architecture.
- Backlog checkboxes summarize progress. Once a detailed task exists, its scope, approval, and
  evidence are maintained there; the backlog links to it instead of duplicating those fields.
- Current state is a handoff summary, not another backlog, approval log, or test report.
- Preserve stable task, requirement, and ADR IDs so links survive later refinement.
- Prefer adding detail to an existing relevant document. Add a new document only when it has a
  distinct purpose. Future implementation guides are created when that work is approved.
