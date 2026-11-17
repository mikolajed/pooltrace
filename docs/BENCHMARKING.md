# System evolution benchmark plan

Status: Draft methodology. Benchmarking intent is accepted in
[ADR-0002](adr/0002-typescript-first-and-measured-evolution.md). No harness, runs, or results exist.
Detailed workloads, tools, run counts, and acceptance budgets require review before execution.
Storage evolution is planned under [ADR-0003](adr/0003-sqlite-first-and-storage-evolution.md), with
the additional comparison requirements below.

## Questions to answer

Compare the working TypeScript baseline with a proposed replacement on equivalent work:

- Does it preserve exact calculations, provenance, and failure behavior?
- What changes in latency, sustained throughput, CPU use, and memory use?
- Where do RPC, local execution, serialization, and process boundaries contribute to the result?
- Does it improve recovery, observability, or maintainability enough to justify added complexity?

The upgrade may involve Rust and Python, but benefits are hypotheses. Report neutral or negative
results as honestly as improvements. A useful research result need not be a speedup.

## Establish the reference before migration

Once an approved TypeScript slice works, preserve its exact source revision or source content hash,
dependency lockfile, runtime version, configuration, and reproducible reference inputs/outputs.
Add reference cases as the approved system gains fork execution, persistence, and a web API.
Do not expand the first implementation task just to build a benchmark platform.

Version the scenario and evidence schemas. Include token units, input sizes, venue identities,
snapshot provenance, explicit unavailable costs, and result/error states. Never use changing
latest-state observations as the only source of reference behavior.

## Correctness gate

Before comparing performance, run both implementations against identical cases and compare:

- Exact first/second-leg amounts, final amounts, signed gross/net profit where available, selected
  best tested sizes, and all rounding/range behavior.
- Chain/block identity and timestamps, cost source/assumptions, and quoted-versus-simulated evidence.
- Stale/incomplete/invalidated observations, per-venue failures, unavailable values, and rejection
  behavior. A faster system that silently drops errors or work is not an equivalent result.

Use deterministic stored fixtures and isolated local forks at the same selected state. Include
rounding boundaries and range/overflow cases when replacing TypeScript bigint arithmetic.
Document intentional behavior corrections and update the reference explicitly rather than hiding
mismatches. A reference implementation can contain defects; protocol and contract behavior remain
independent checks. Apply [CORRECTNESS.md](CORRECTNESS.md) throughout.

## Separate workloads

| Workload | Controlled inputs | Measure and interpret |
| --- | --- | --- |
| Domain computation | Identical stored V2 reserve/quote inputs, routes, six sizes, and larger explicitly synthetic batches | CPU time, latency, and throughput for equivalent local calculations; this does not benchmark a recreated V3 engine |
| RPC adapter replay | Recorded or controlled RPC responses with the same response/error schedule | Encoding/decoding, scheduling, retries, provenance validation, and orchestration overhead; label as replay |
| Live collection | Same selected block, provider/region, quote set, request budget, concurrency, and cache policy | Complete observation latency and RPC failures; network/provider variability prevents attributing every difference to language |
| Full local-fork simulation | Same fork block/hash, executor bytecode, route, funding/setup, and isolated starting state | Host orchestration time, result parity, and full transaction receipts; report transaction gas separately from backend CPU time |
| Evidence and API path | Same stored dataset, write/read operations, payloads, and client load | Persistence/API latency, update delivery where implemented, throughput, and total participating-process memory |
| Python research task, if introduced | Same versioned dataset and defined analytical result | Analysis time, resource use, and reproducibility; do not compare an unrelated notebook with the live quote engine |

Use the real initial three-pool/six-size workload as the primary scenario. Label larger stress
workloads as extensions or synthetic scenarios; do not present their throughput as live market
opportunity capture. Stored V3 quote responses measure processing/replay, not live quoter execution.

## Fair comparison and run records

- Keep hardware, OS, resource limits, datasets, correctness checks, and workload definitions fixed.
  Record source versions, dependencies, Node/Bun/Python versions where used, Rust compiler and
  build settings, RPC/provider details without credentials, and local-node configuration.
- Separate cold startup from warmed steady-state runs. Use equivalent build modes and record
  warmup, measured iterations, duration, cache state, and run ordering. Avoid comparing a Rust
  release build with TypeScript development/watch instrumentation.
- Repeat runs and report sample counts, units, a central measure, tail latency where meaningful,
  and variability. For sustained-load tests report offered load, completed work, errors, timeouts,
  and backlog growth. Do not publish a single best run as the typical result.
- Separate a language/runtime port from architecture changes such as batching, caching, a new
  provider, different concurrency, or fewer validations. If several change together, label it a
  system comparison and do not claim to have isolated Rust's contribution.
- Include HTTP/IPC, serialization, startup, queueing, and all participating application processes
  when measuring a combined architecture. Break down shared external components such as Anvil so
  their resource costs are not counted inconsistently.
- Do not infer Solidity gas savings from host-language speed. With equivalent executor behavior,
  report observed receipt gas and execution results independently of host performance.

Keep raw measurements and the exact reproduction procedure with the approved benchmark task's
evidence. Disclose exclusions, failed/skipped checks, missing baselines, and measurement limits.
No numerical improvement targets or results are established in this setup.

## Adoption review

Before a migration experiment, agree on its purpose, workload, correctness gate, and practical
performance/resource/recovery budgets. Define checks for relevant RPC timeouts, partial failures,
reorg/stale input, restart/recovery, and overload as those capabilities exist.

Report the result across correctness, performance, operational behavior, and maintenance effort.
Preserve a reproducible TypeScript reference for the comparison and a rollback path until the new
implementation is validated. Accepting a benchmark report is not permission to deploy or expand
the implementation scope; follow the task/ADR approval workflow.

## Storage evolution comparisons

Capture a reproducible SQLite baseline once persistence is implemented. Evaluate future options
for their intended roles; PostgreSQL operational transactions, ClickHouse analytical queries,
Parquet dataset files, and object-store artifact access require different workload definitions.

First verify exact-value round trips, signed profits, relationships, record coverage, provenance,
unavailable states, invalidations, and query-result equivalence. Approximate analytical outputs,
if separately approved, must be labeled and cannot replace exact financial evidence.

| Comparison | Keep explicit | Measurements and evidence |
| --- | --- | --- |
| Operational store | Same dataset, transactions/queries, indexes, batch sizes, concurrency, and stated durability guarantees | Durable write/read latency, throughput, CPU/memory/disk, contention/errors, storage growth, restart and backup/restore behavior |
| Analytical store | Same historical coverage, filters, aggregations, exactness, ingestion watermark, and cache state | Query latency/throughput, ingestion lag, result parity, scanned/stored bytes, resource use, and handling of invalidated records |
| Parquet export/import | Same records, declared numeric encoding/schema, partitioning/compression settings, and reader/writer versions | Exact round trips, export/read time, file size, integrity/manifests, and research/replay reproducibility |
| Object storage | Same artifacts, placement/network, access pattern, concurrency, and retention/retrieval assumptions | Upload/download latency, throughput, retries/integrity, request and transfer volumes, storage size, and dated costs when available |
| Migration/recovery | Same source snapshot and defined export/backfill/cutover process | Completion time, duplicate/missing records, exact-value/result checks, interruption recovery, rollback, and demonstrated restore |

Hold the application language/runtime and workload fixed when isolating storage effects. Record
database/driver versions, schema/index definitions, storage hardware, database placement/network,
transaction and flush/synchronization settings, background maintenance, compression, and dataset
size. Report cold and warm results separately and repeat measurements with variability.

Differences in durability, transaction semantics, query exactness, freshness, or omitted work must
be disclosed; faster acknowledgement with weaker guarantees is not an equivalent result. Include
all application/database processes and transfer/serialization overhead in system measurements.
Bucket storage is not an operational SQL substitute, and exporting Parquet is not equivalent to
committing an observation transaction.

Storage and language migrations may be tested independently. If both change together, report a
combined system comparison rather than attributing the result to either change alone. No storage
benchmark or cost result exists yet; STORE/BENCH tasks require review before execution.
