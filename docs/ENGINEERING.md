# Engineering conventions

These are requirements and working conventions for future approved implementation. They do not
authorize code or dependency installation.

## Tooling baseline

| Area | User-specified direction | Decision still needed |
| --- | --- | --- |
| Package management and commands | Bun | Supported version and reproducible lockfile policy at integration |
| Initial application | TypeScript backend and frontend; Node.js in the original worker brief | Worker runtime and workspace boundaries in [ADR-0001](adr/0001-project-boundaries-and-tooling.md) |
| EVM interaction | viem | Supported version and exact APIs from current official documentation |
| Contracts and local forks | Solidity, Foundry, Anvil | Compiler/dependency versions, router APIs, and local execution design |
| TypeScript tests | Vitest | Version and configuration for the approved runtime |
| Evidence persistence | SQLite initially, under [ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) | Driver, schema, migrations, and writer ownership |
| Terminal | Next.js, React, Tailwind, shadcn/ui, SSE | Versions, read path, and reconnect semantics |
| Local runtime topology | UI application + one backend; early embedded SQLite; on-demand Anvil in M2 | Exact runtime/configuration/lifecycle under [ADR-0004](adr/0004-local-processes-and-gated-deployment.md) |

Bun's selection as package manager does not by itself replace the original worker runtime.
No dependency versions or deployment addresses are selected in this setup.

## Language evolution

[ADR-0002](adr/0002-typescript-first-and-measured-evolution.md) records the accepted TypeScript-first
direction and planned later evolution, potentially to a Rust backend, TypeScript frontend, and
Python research tools. Begin with TypeScript application code only; Solidity and Foundry/Anvil
remain part of the contract/fork toolchain. Future language/process boundaries need their own design
and implementation approvals.

Keep the initial TS system usable as a reference. Preserve explicit domain boundaries, evidence
contracts, units, rounding, and error behavior so later replacements can be checked against it.
Do not create a generic cross-language framework or separate services in anticipation of migration.

Benchmark replacements using the [draft comparison plan](BENCHMARKING.md). Keep authoritative
financial calculations consistent across implementations; adding languages is not itself evidence
of improved robustness or performance.

## Storage evolution

[ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md) records SQLite as the initial persistence
choice and PostgreSQL, ClickHouse, Parquet, and object storage as future candidates. It owns the
possible roles, adoption criteria, preservation requirements, and authoritative references.

Keep database-specific operations outside domain calculations. Future storage choices must preserve
exact amounts and evidence semantics. ADR-0004 moves the reviewed minimal driver/schema/migration
design into M1; M3 covers richer evidence/replay/recovery. Both require implementation approval.
Language and storage migrations can proceed independently. Use the storage comparison methodology
in [BENCHMARKING.md](BENCHMARKING.md) before claiming an improvement.

## Local execution and future releases

[ADR-0004](adr/0004-local-processes-and-gated-deployment.md) selects separate UI/backend application
processes on localhost. Collection, RPC, analysis, storage, API, and SSE are backend modules rather
than independent services. The backend owns SQLite access; Anvil is a separate on-demand process
introduced with M2, initially one fork job at a time. CLI access must not create another independent
collection or calculation authority.

[DEPLOYMENT.md](DEPLOYMENT.md) owns process lifecycle and the draft future CI/CD/environment plan.
Keep checks reproducible locally before automating them. Hosting and pipeline implementation remain
future tasks; passing CI does not authorize a production change. Preserve data separately from
release artifacts and verify migration/recovery behavior before a hosted rollout.

## Structure and dependencies

Separate domain calculations, protocol I/O, worker orchestration, persistence, web presentation,
and Solidity execution. The exact directory design remains proposed in ADR-0001.

Keep arithmetic independent of RPC clients, storage, frontend code, and ambient time. Pass external
state into domain calculations explicitly. Favor the smallest design that satisfies the approved
scope; do not add orchestration frameworks, services, or abstractions without a concrete need.

## Integration and configuration

- Consult current official documentation when integrating a dependency. Preserve the source,
  retrieval date, and important assumptions in the relevant ADR or implementation documentation.
- Verify deployment and token addresses from authoritative sources and on-chain state before use.
  Do not choose pools solely from an example or presumed popularity.
- Document configuration, units, defaults, and failure behavior. Provide `.env.example` with the
  approved runtime setup; keep actual credentials out of Git, reports, fixtures, and logs.
- Never silently substitute fixtures when live access fails. Fixture mode must be explicit.

## Verification and reporting

Use Vitest for meaningful TypeScript checks and Foundry for contract unit, fuzz, invariant, and fork
checks, as applicable to the approved task. Link checks to the stable requirements in
[CORRECTNESS.md](CORRECTNESS.md), rather than testing only implementation details.

Separate offline tests, live RPC integration checks, and local-fork execution evidence. Record the
commands actually run and their outcomes in the task record; do not invent successful results.
Testing is not formal verification. Security assumptions and remaining limitations must be stated.

Write setup and mathematics documentation alongside approved work. Optional enhancements belong in
the backlog, not in an unapproved expansion of the current task.
