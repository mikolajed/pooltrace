# 0002: TypeScript first, followed by measured backend evolution

- Status: Accepted
- Proposed on: 2026-11-17
- Decision accepted by user: 2026-11-17; language direction and benchmarking intent only
- Related documentation task: [SET-10](../tasks/SET-10-language-evolution-and-benchmarks.md)
- Related implementation work: EVO and BENCH items in [BACKLOG.md](../BACKLOG.md)
- Requirement IDs: CR-01 through CR-11 in [CORRECTNESS.md](../CORRECTNESS.md)
- Supersedes / superseded by: None

## Context

The user wants to begin with a purely TypeScript application and plans to evolve it toward a more
capable system, potentially combining Rust, TypeScript, and Python. The user also wants to benchmark
that evolution through subsequent product milestones.

The application language choice does not replace the Solidity executor or Foundry/Anvil tooling.
Bun remains selected for JavaScript/TypeScript package management and project commands; the exact
initial worker runtime and workspace layout are still proposed in
[ADR-0001](0001-project-boundaries-and-tooling.md).

## Decision

Start the backend and frontend application code in TypeScript. Do not introduce Rust backend code,
Python analysis modules, or language-bridging services in the initial implementation. Build the
TypeScript backend as a useful, testable system that can serve as the reference for later migration.

Plan for subsequent backend evolution. Rust is the likely candidate to replace the TypeScript
backend, potentially including its domain calculations, RPC adapters, persistence, API, and worker
orchestration. The migration can proceed component by component while keeping the system usable.
TypeScript would remain appropriate for the frontend. Python is a candidate for research and
historical analysis when specific tasks benefit from it.

This is a direction for investigation and development, not a final three-language topology.
Exact component ownership, process boundaries, libraries, and migration order need later ADRs and
explicit implementation approval. A separate TypeScript RPC service is not a requirement of this
decision. Learning Rust and demonstrating a validated migration are legitimate motivations alongside
performance; a performance bottleneck is not a prerequisite for proposing the migration.

Preserve migration boundaries in the initial design without building speculative infrastructure:

- Keep domain calculations separate from protocol I/O, storage, orchestration, and presentation.
- Make units, rounding, result states, and snapshot provenance explicit.
- Use versioned evidence/export contracts when they are introduced. Serialize exact amounts as
  base-unit decimal strings across JSON boundaries rather than lossy numeric values.
- Retain fixtures, protocol comparisons, and fork cases as reference behavior for replacements.
- Maintain one authoritative implementation for production results at a time. A replacement may
  run alongside it for comparison; label and retain discrepancies before switching authority.

Benchmark the TypeScript baseline and later replacements under a documented, comparable workload.
Demonstrate correctness before reporting speedups. Measure operational and maintenance tradeoffs
as well as latency, throughput, and resource use. [BENCHMARKING.md](../BENCHMARKING.md) contains the
draft methodology; its detailed workloads, budgets, and tools remain to be reviewed before execution.
Do not promise that the later architecture will be faster or more robust before evidence exists.

## Alternatives considered

- **Rust from the start:** avoids a later port, but adds another learning/integration dimension before
  establishing working behavior and a reference dataset.
- **Rust, Python, and TypeScript services immediately:** establishes process boundaries early, but
  also creates serialization, orchestration, and failure-handling work before their roles are proven.
- **TypeScript permanently:** remains viable if it meets the project's needs; it does not provide
  the intended migration comparison unless a later replacement is actually built and evaluated.
- **A complete replacement in one step:** is possible, but makes behavior changes harder to isolate.
  Incremental migration supports more focused correctness and benchmark comparisons.

## Consequences

Some backend behavior will be implemented more than once if migration proceeds. The TypeScript
system must remain understandable and correct rather than becoming a disposable prototype.
Language changes introduce differences in integer range/overflow behavior, serialization, error
handling, and runtime operation that require explicit verification.

More languages or processes alone do not establish robustness. Each addition must have a stated
role, preserve the correctness requirements, and report its actual tradeoffs. Language evolution
does not automatically change a milestone's workload or authorized execution boundary.

## Acceptance and validation criteria

- The initial application stack is TypeScript, with Solidity retained for EVM execution.
- No Rust/Python implementation is added without its own approved scope.
- A working TypeScript version and reproducible reference cases are retained before migration.
- Future replacement results are checked against the same inputs and selected chain/fork state.
- Benchmark reports disclose methodology, source versions, environment, variability, failures,
  regressions, and limitations; there are no assumed improvements or fabricated results.

## Approval record

The user explicitly requested documenting that the project will start purely with TypeScript,
plan expansion probably using Rust/TypeScript/Python, and benchmark the upgrade. This accepts that
strategic direction. It does not accept the proposed workspace/runtime in ADR-0001, select a final
future architecture, or authorize application implementation or benchmark execution.

Implementation authorizations remain in task records under [WORKFLOW.md](../WORKFLOW.md).

## Implementation and evidence

Documentation only; see SET-10. No TypeScript baseline, Rust port, Python module, benchmark harness,
or performance result exists yet.
