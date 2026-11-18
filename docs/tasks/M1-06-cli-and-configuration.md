# M1-06: Runnable CLI and configuration documentation

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md)
- Requirement IDs: CR-06, CR-09, CR-10, CR-11; preserve CR-01 through CR-05 in
  [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed [M1-05](M1-05-quotation-and-cycle-analysis.md), accepted ADRs above,
  explicit approval of this implementation scope, and configured RPC access for live verification

## Outcome

A documented diagnostic command that runs the existing backend's one-shot snapshot/quotation
analysis in an explicitly selected live or fixture mode. A user can inspect all 36 route/size
outcomes, qualification, the best tested gross result when available, provenance, and unavailable
transaction costs/net profit without invoking an integration-test harness.

The CLI is a presentation/configuration entry point over shared backend behavior. It does not
create a second calculation authority or a separately running collection service.

## Scope

| Deliverable | Bounded implementation |
| --- | --- |
| Runnable entry point | Add one documented root Bun command executed with the pinned Node runtime, using the existing backend workspace. Parse arguments, show help without RPC, run one attempt, print its result, and exit. No unrelated app/package scaffold. |
| Explicit live mode | Use validated private configuration and the existing collection, analysis, and use-time eligibility functions. Preserve the selected endpoint, six-size policy, hash/canonical selectors, budgets, admission rules, and unavailable-cost boundary. |
| Explicit fixture mode | Provide reproducible constructed data usable outside the test runner, injected through the same backend/protocol boundary. Require no live credentials and make no network requests. Label origin, addresses/state, and timestamps as fixture evidence; never present the result as live or independently verified market data. |
| Human-readable output | Show mode/origin, chain/block/hash and observation/validation time/age, qualification/completeness, all route/size outcomes and reasons, the best tested gross result when eligible, and explicit unavailable costs/net profit. Use exact token formatting without changing authoritative amounts; plain text must communicate every state without color. |
| Machine-readable output | Emit a documented, versioned JSON result/error envelope with exact decimal-string bigint amounts, units, provenance/as-of information, and all 36 terminal outcomes when analysis starts. Keep logs/progress out of JSON stdout and private configuration out of every output. |
| Configuration | Document argument/environment/default precedence, both modes, the existing private RPC/provider labels, optional six-size override, errors, exit codes, and copy/paste examples. Update README and `.env.example` as needed; preserve existing integration commands. |
| Shutdown and errors | Pass cancellation to the shared backend, sanitize errors, terminate only the CLI's owned work, and exit predictably. No listener, daemon, transaction, retry at another block, provider fallback, or implicit fixture fallback. |
| Verification | Preserve existing checks, add meaningful CLI/parser/rendering/process tests, and record offline fixture/help/configuration and read-only live command evidence. Root checks must cover the actual entry point and any reusable fixture module. |

Runtime fixtures belong in an appropriate explicitly named source module, not an import from
test-only files or a separate implementation of quotation arithmetic. Fixtures may be shared
with tests where useful; their results remain constructed even when every check passes.

## Accepted command and behavior contract

The following commands are implemented on the pinned runtime:

```sh
bun run cli --help
bun run cli --mode fixture
bun run cli --mode live
bun run cli --mode live --format json
bun run cli --mode live --sizes '["10","50","100","500","1000","5000"]'
```

Require `--mode live|fixture` for an analysis run; there is no default live mode. Default output
is text, with `--format text|json` available. `--help` needs no endpoint or other application
configuration. Reject unknown modes/options, conflicting arguments, and malformed size grids
before starting network work. Document how help and JSON flags interact.

Size precedence is an explicit `--sizes` JSON array, then `USDC_INPUT_AMOUNTS`, then ADR-0006's
default grid. Every override uses the existing exact six-size parser. For live configuration,
preserve the documented root `.env`, `.env.local`, and process-environment precedence, with
process values overriding files. Keep the endpoint in private environment configuration rather
than adding a credential-bearing command-line URL argument. Fixture mode must work with missing
or invalid live RPC settings and must not use the real endpoint.

| Exit code | Meaning |
| --- | --- |
| 0 | Help, or a completed usable live result, or a completed qualified explicit fixture result. A nonpositive best gross result and expected unavailable net costs are normal outcomes. Fixture success never means live workload admission. |
| 1 | Runtime/provider failure or an analysis that is rejected, incomplete, stale, invalidated, or otherwise unavailable for its requested mode. Preserve returned evidence and reasons instead of inventing a successful result. |
| 2 | Invalid usage/configuration, reported without exposing supplied secrets or beginning RPC. |
| 130 | User interruption after cancellation/cleanup of the command's owned work. |

JSON run results/errors must remain parseable without extracting text from banners or logs.
Diagnostic stderr is sanitized. Text output must distinguish a negative/zero complete gross result
from an incomplete/rejected comparison, and a positive gross quote from available estimated net
profit. Compute eligibility immediately before formatting; output is as-of its recorded event,
not a promise of continuing freshness after the process exits.

## Outside scope

- New V2/V3 math, fee/impact/size/ranking policy, quoter/provider choices, or weaker snapshot rules.
- HTTP API/SSE, browser UI, interactive terminal/TUI, watch mode, scheduler, daemon, or multi-process
  startup/readiness workflow (M1-11/12 and M4). The CLI invokes the shared modules directly for now.
- SQLite, schemas, migrations, history queries, archive loading as live state, or an application
  evidence store (M1-09/10). Shell redirection/JSON output is not database persistence.
- Executor/fork execution, wallets, transaction submission, or a live transaction-cost producer.
- New chains, tokens/venues, provider fallback, deployment, CI/CD, benchmarks, and unrelated upgrades.
- Further commits and pushes beyond the separately requested initial scope-document and completed
  implementation commits. No push is authorized.

## Decisions and remaining dependencies

ADR-0004 selects shared backend authority and a diagnostic CLI; ADR-0005/0006 own the existing
market-data/calculation policy. This slice wraps that implemented behavior. Routine parser,
rendering, and module choices can be made within approved scope; a material architecture or
policy change must return for review rather than be hidden inside CLI work.

M1-05 already records independent protocol/admission evidence. M1-06 adds command/configuration/
presentation evidence, not a new claim of permanent liquidity or profitability. Initial live costs
and net profit remain unavailable; fixtures and historical reports never confer live eligibility.

The initial command may run directly over the backend modules because no backend API exists yet.
A future API transport belongs to its own task; do not create a service or duplicate collector
merely to provide this CLI. Storage and the other M1 application tasks remain required later work.

## Acceptance criteria

- [x] The user explicitly approves this bounded M1-06 implementation scope.
- [x] A documented root command executes on the pinned Node/Bun baseline and is included in root
  type/lint/test checks, with no duplicated collection or arithmetic authority.
- [x] Help and invalid usage/configuration behave without RPC; precedence and exact size parsing
  match the documented contract and existing backend behavior.
- [x] Explicit fixture mode works offline without credentials, never reaches live transport, and
  visibly preserves fixture origin and constructed evidence in text and JSON.
- [x] Live mode uses the shared pipeline and recomputes/renews eligibility before output; no
  selector, budget, venue, qualification, or origin fallback is introduced.
- [x] Text/JSON output preserves exact units and all available route/size outcomes, clearly
  distinguishes empty/nonpositive, rejected/incomplete/stale/invalidated states, and never turns
  gross returns, diagnostic quoter gas, or unavailable costs into net-profit claims.
- [x] Exit codes, stdout/stderr, sanitized errors, and cancellation satisfy the contract. Owned
  work terminates without leaving an application service or touching unrelated processes.
- [x] Meaningful offline/process tests pass alongside the existing suite; configuration/commands
  are reproducible from the documented setup and frozen lockfile.
- [x] Actual CLI live and fixture validation is recorded separately, with chain/block/as-of
  provenance, command/exit evidence, unavailable fields, and honest failures or limitations.
- [x] README/configuration guidance, task evidence, backlog, and current state are updated; no
  subsequent task, persistence, public service, execution, commit, or push begins automatically.

## Validation matrix

This matrix defines the checks; actual results are recorded under evidence below.

| Case | Expected evidence |
| --- | --- |
| C01 — parsing/help | Actual help/usage runs and invalid/missing/conflicting flags; valid exact sizes and rejected grids; no RPC before invalid configuration or help. |
| C02 — configuration/mode isolation | Documented precedence, required live URL, safe missing/invalid settings, fixture mode without credentials, and a sentinel live transport that fixture mode never calls. |
| C03 — shared behavior | CLI orchestration uses the existing backend pipeline; identical supplied fixture inputs produce its same 36 outcomes, qualification, and ranking without copied financial logic. |
| C04 — formatting/precision | Exact USDC/WETH/base-unit strings, signed values, gross labeling, provenance/as-of/validation states, unavailable cost/net objects, and plain parseable JSON stdout with no ANSI/progress/log contamination. |
| C05 — honest outcomes | Complete nonpositive results, explicitly constructed gross-positive results, blocked/rejected/incomplete/stale/invalidated/unavailable cases, and correct mode-specific status/exit codes. No false best result or fixture-to-live promotion. |
| C06 — failure/cancellation | Sanitized provider/configuration diagnostics, controlled cancellation reaching backend abort handling, expected interruption exit, ignored late responses, and no lingering owned service/work. |
| C07 — process/reproducibility | Exercise the actual root command for help and fixture/text/JSON/configuration cases; run root checks and frozen-lockfile clean setup. Keep assertions about semantic output/exit behavior rather than incidental column widths. |
| C08 — read-only live CLI | Run the actual live command through the configured endpoint, retain sanitized command/output/exit and real chain/block/analysis evidence, and verify eligibility/state presentation agrees with the shared backend. |

During approved implementation, perform at least one real live CLI smoke run that
collects chain/block data and reaches the shared analysis path. Record qualification and CLI
handling separately: a legitimately rejected/unavailable analysis may demonstrate correct CLI
presentation/exit behavior, but must not be counted as a qualified grid. No positive opportunity
is required. Also exercise fixture mode without endpoint access and both text/JSON output paths.

Missing endpoint access or total failure before usable chain/analysis evidence leaves the live
integration check unverified; do not manufacture completion from a fixture or merely printed
error. Record the failed gate and keep it incomplete unless real evidence or an explicit user
scope revision resolves it. Controlled failure cases are offline evidence unless actually observed
live. Update the README with commands actually validated and disclose any remaining limitations.

## Approval record

- Documentation preparation: On 2026-11-18 the user said “do it” after the proposal to prepare
  the M1-06 scope document for review. This authorizes this task document and navigation/current
  state updates, not implementation.
- Related design acceptance: ADR-0004/0005/0006 are accepted; their records own the actual decisions.
- Implementation approval: Granted on 2026-11-18 for M1-06 only.
- Approved implementation scope and user instruction: “Lgtm, commit now, then mark this as
  accepted and move on with more work”. The reviewed M1-06 scope is accepted for implementation,
  including its offline/process checks and configured read-only live CLI validation.
- Separate commit authorization: The same instruction explicitly authorizes the initial reviewed
  scope-document commit, overriding the default user-only commit rule for that action. Commit
  `843c8ba` contains the three prepared documentation files. Further commits/pushes and later
  tasks are not authorized by this bounded instruction.
- Implementation commit authorization: After the completed M1-06 handoff, the user said “commit”
  on 2026-11-18. This authorizes one commit of the reviewed implementation, tests, documentation,
  and evidence; it does not authorize a push or later task.

## Preparation history

Before approval, prepared for scope review on 2026-11-18. M1-06 implementation had not started. No application code,
fixture module, tests, dependencies, live RPC, commits, or pushes were introduced during preparation.
Preparation checks passed on 2026-11-18: local links/anchors, whitespace, and defined CR references
across 33 Markdown files; `git diff --check`; unique C01–C08 cases; exactly three documentation
changes; the Proposed/unapproved task state; and unchanged Git HEAD `5987f92`. Application,
dependency, configuration, and existing evidence files are unchanged. No behavioral tests or live
checks were run for this documentation-only preparation. Proposed scope is not implementation approval.

## Evidence and handoff

Completed on 2026-11-18 under the explicit approval above. The reviewed scope was committed first
as requested (`843c8ba`), then acceptance and implementation were recorded. Implementation changes
were uncommitted at the first handoff. The user then explicitly requested their implementation
commit. No push, M1-07, or later task was started.

### Implemented artifacts

- [`cli.ts`](../../apps/backend/src/cli.ts) owns the one-shot process and SIGINT listener;
  [`cli-runner.ts`](../../apps/backend/src/cli-runner.ts) parses strict arguments, loads environment
  files, validates exact sizes, delegates to shared snapshot/analysis/use-time functions, and
  renders exact text or versioned JSON. It adds no external dependencies or financial policy.
- [`fixtures.ts`](../../packages/protocols/src/fixtures.ts) holds explicitly constructed wire
  responses, shared with tests through re-export shims. Only selected fixture mode dynamically
  imports the source subpath. Fixed block 100/time 1700000000 and synthetic pool addresses are
  not market evidence. V2 replies reuse domain arithmetic; V3 replies are a fee-adjusted marginal
  construction, not independent swap-model validation. M1-05 retains separate protocol evidence.
- [`cli.test.ts`](../../apps/backend/test/cli.test.ts) covers C01–C07. Its test-only signal preload
  is neither imported by the app nor exposed by a public flag. The actual root Bun command
  receives SIGINT during a controlled pending request, returns cancellation JSON, and exits 130.
- The [README](../../README.md#diagnostic-cli), [`.env.example`](../../.env.example), and
  [engineering notes](../ENGINEERING.md#diagnostic-cli) document implemented commands, exact units,
  help/JSON interaction, precedence, exits, and as-of limitations. Existing integration commands
  and private configuration are preserved.

### Actual checks

| Command/check | Actual result on 2026-11-18 |
| --- | --- |
| `bun run check` | Passed toolchain, strict root/domain/protocol/backend TypeScript, Biome lint/format, and **116 tests across five files** (95 existing + 21 CLI cases). |
| Clean `bun install --frozen-lockfile && bun run check` | Passed in `/private/tmp/pooltrace-m1-06-9l6gbq7y`, without `.env`, `.env.local`, `.git`, `data`, or copied dependencies. Source files matched the workspace; all 116 tests passed. Installation required sandbox elevation for cache/temp access. |
| `bun run cli --help` and JSON help | Actual root-process tests passed; no environment read or RPC. |
| Invalid flags/live config, exact grids, environment precedence | Passed controlled and process checks. Invalid configuration exits 2 before RPC; private supplied values are absent from diagnostics. |
| `bun run cli --mode fixture` and `--format json` | Actual manual commands exited 0; actual subprocess tests passed without credentials. All 36 rows, constructed origin, unavailable costs, no live admission, no live transport. |
| Exact formatting/honest outcomes | Passed signed/large/small amounts, zero/nonpositive and constructed positive gross, partial-fill/impact/identity/direction failures, stale/terminal invalidation, and unavailable cases without a false best result. |
| Cancellation/provider failure | Passed forwarding/late-response checks from the shared suite, sanitized runtime exit 1, and actual Bun-process SIGINT exit 130. No owned application service remains. |
| Actual live JSON/text commands | Both exited 0 with real Ethereum chain/block/analysis evidence and qualified 36/36 grids; details below. |

The clean install retained the unchanged `bun.lock` SHA-256
`915b2f3f4baa2461b0e87e4796eaa1d27771c12b4189ddb211e0e38e939c1870`.
No toolchain or external dependency versions changed. Node built-in argument/signal documentation
was consulted and behavior verified on Node 26.3.1; no framework or runtime upgrade was needed.

Manual fixture JSON output was recorded at **2026-11-18T13:26:16.822Z** with constructed block
100/hash `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` and fixed timestamp
1700000000. It was usable as fixture evidence only; best gross was **-0.034985 USDC** for 10 USDC
via V3-500 → V3-3000. UUID/event times vary; constructed state/amounts are reproducible. It did not
use the live endpoint or gain live admission.

### Actual read-only live CLI

The first sandboxed JSON invocation exited 1 with sanitized `network` failure and no chain/block
or analysis. This did **not** pass C08. The same approved read-only command was rerun with network
elevation; both successful reports below retain actual CLI stdout, scanned for the configured URL
and credential values before archiving. The JSON archive has repository formatter whitespace;
parsed contents match the original stdout exactly. Text is unchanged. Bun's command banner was
stderr, not part of either file. The archive initially failed formatting; applying the repository
formatter resolved it, and final lint/format/whitespace checks passed.

| Command and archived stdout | Exit and actual result |
| --- | --- |
| `bun run cli --mode live --format json` — [JSON](../evidence/M1-06-cli-live-2026-11-18.json) | 0; chain 1, block **26442213**, hash `0x870eb62544c3caff40148b1fa2f5f62d7a530ed6d2eed111af22f3e542468c5a`; as-of **2026-11-18T13:22:27.790Z**. Canonical/fresh, age 16790 ms, head lag 1, validation current, all 36 quotes qualified and admitted. Best tested gross **-0.024121 USDC** for 10 USDC, V3-3000 → V3-500. |
| `bun run cli --mode live` — [text](../evidence/M1-06-cli-live-2026-11-18.txt) | 0; chain 1, block **26442216**, hash `0x9f7adb4b3417254a1839d4be12c4a26f3d65596f3a32827b7771ad9fdbae561b`; as-of **2026-11-18T13:23:07.982Z**. Canonical/fresh, age 20981 ms, head lag 1, validation current, all 36 quotes qualified and admitted. Best tested gross **-0.026893 USDC** for 10 USDC, V3-500 → V2. |

The two commands collected different blocks; their results are not a same-state comparison.
Transaction costs and net profit are explicitly unavailable (`full_transaction_evidence_missing`)
in both outputs. All evidence is historical as-of its recorded event. No positive opportunity,
transaction, execution, fork, finality, or capture claim is made. Controlled failure cases remain
offline evidence. No separate replay/expiry sleep was added to the public one-shot CLI; those
checks remain in M1-05's integration harness.

Final handoff checks cover local Markdown links/anchors and CR references, `git diff --check`,
credential scans, unchanged lockfile/brand reference, and pre-commit Git HEAD `843c8ba`.
Next proposed work is to prepare M1-07's remaining validation scope for review; it has not started.
