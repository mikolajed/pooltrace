# M1-06: Runnable CLI and configuration documentation

- State: Proposed
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

## Proposed command and behavior contract

The following examples specify the proposed interface; these commands do **not** exist yet:

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
- Commits and pushes. Only the user creates commits.

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

- [ ] The user explicitly approves this bounded M1-06 implementation scope.
- [ ] A documented root command executes on the pinned Node/Bun baseline and is included in root
  type/lint/test checks, with no duplicated collection or arithmetic authority.
- [ ] Help and invalid usage/configuration behave without RPC; precedence and exact size parsing
  match the documented contract and existing backend behavior.
- [ ] Explicit fixture mode works offline without credentials, never reaches live transport, and
  visibly preserves fixture origin and constructed evidence in text and JSON.
- [ ] Live mode uses the shared pipeline and recomputes/renews eligibility before output; no
  selector, budget, venue, qualification, or origin fallback is introduced.
- [ ] Text/JSON output preserves exact units and all available route/size outcomes, clearly
  distinguishes empty/nonpositive, rejected/incomplete/stale/invalidated states, and never turns
  gross returns, diagnostic quoter gas, or unavailable costs into net-profit claims.
- [ ] Exit codes, stdout/stderr, sanitized errors, and cancellation satisfy the contract. Owned
  work terminates without leaving an application service or touching unrelated processes.
- [ ] Meaningful offline/process tests pass alongside the existing suite; configuration/commands
  are reproducible from the documented setup and frozen lockfile.
- [ ] Actual CLI live and fixture validation is recorded separately, with chain/block/as-of
  provenance, command/exit evidence, unavailable fields, and honest failures or limitations.
- [ ] README/configuration guidance, task evidence, backlog, and current state are updated; no
  subsequent task, persistence, public service, execution, commit, or push begins automatically.

## Planned validation

These are planned checks, not executed tests or new live evidence:

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

During separately approved implementation, perform at least one real live CLI smoke run that
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
- Implementation approval: Not granted.
- Approved implementation scope and user instruction: None recorded.

## Evidence and handoff

Prepared for scope review on 2026-11-18. M1-06 implementation has not started. No application code,
fixture module, tests, dependencies, live RPC, commits, or pushes were introduced during preparation.
Preparation checks passed on 2026-11-18: local links/anchors, whitespace, and defined CR references
across 33 Markdown files; `git diff --check`; unique C01–C08 cases; exactly three documentation
changes; the Proposed/unapproved task state; and unchanged Git HEAD `5987f92`. Application,
dependency, configuration, and existing evidence files are unchanged. No behavioral tests or live
checks were run for this documentation-only preparation. Proposed scope is not implementation approval.
