# M1-08: Document mathematics, assumptions, commands, and actual milestone evidence

- State: Done
- Milestone: M1 — local read-only research application
- Related ADRs: [ADR-0001](../adr/0001-project-boundaries-and-tooling.md),
  [ADR-0004](../adr/0004-local-processes-and-gated-deployment.md),
  [ADR-0005](../adr/0005-registry-verification-and-consistent-snapshots.md),
  [ADR-0006](../adr/0006-quotation-cycles-and-profitability.md)
- Requirement IDs: CR-01 through CR-06, CR-09, CR-10, CR-11; preserve the execution boundaries
  in CR-07/CR-08 and [CORRECTNESS.md](../CORRECTNESS.md)
- Depends on: Completed M1-01 through M1-07, their recorded evidence, and approval of this
  bounded documentation-delivery scope

## Outcome

A reader can set up the implemented read-only slice, understand how its exact quotations and
cycles are calculated, interpret its result states, and trace claims to actual checks and reports.
The reader can distinguish constructed examples, historical integration evidence, current as-of
eligibility, and capabilities that still need later implementation.

This documents the working slice through M1-07. It does not declare the whole M1 milestone
complete: SQLite, the API/browser view, and application process lifecycle remain M1-09 through M1-12.

## Existing documentation and the remaining gap

Preparation inspected commit `99fe048`. Existing material already supplies:

- The [README](../../README.md) for pinned setup, CLI commands, private configuration, precedence,
  exact output units, exit codes, and explicit integration harnesses.
- [Engineering conventions](../ENGINEERING.md) for toolchain, module ownership, integration,
  quotation provenance, and CLI implementation conventions.
- ADR-0005/0006 for snapshot, quotation, qualification, ranking, and conditional accounting choices.
- [M1-03](M1-03-registry-and-consistent-snapshots.md#evidence-and-handoff),
  [M1-05](M1-05-quotation-and-cycle-analysis.md#evidence-and-handoff),
  [M1-06](M1-06-cli-and-configuration.md#evidence-and-handoff), and
  [M1-07](M1-07-validation-and-regression-coverage.md#evidence-and-handoff) for actual results,
  source revisions, test expectations, archived reports, and disclosed limits.

The remaining deliverable is a connected explanation of implemented mathematics and evidence
interpretation. Readers currently need to assemble it from decision records, source, and task
history. M1-08 should preserve those sources and improve the reading path without creating
another policy specification or duplicating every command and test report.

## Scope and document ownership

| Deliverable | Bounded work and owner |
| --- | --- |
| Implemented analysis guide | Create [Read-only analysis guide](../ANALYSIS.md). It owns the explanation of implemented calculations, assumptions, worked examples, result interpretation, and links to supporting evidence. This is a distinct purpose from ADR rationale, engineering conventions, and stable correctness requirements. |
| Reproducible entry path | Keep the root README authoritative for setup, command syntax, configuration/size precedence, private endpoint handling, formats, and exits. Clarify or reorganize existing guidance where needed; link the guide for detailed math and result interpretation. Preserve existing commands and useful anchors. |
| Evidence reading path | In the guide, map a representative CLI result to its source observation, block/hash/as-of, quote/leg references, qualification, eligibility, and unavailable costs. Link task evidence and archived public reports rather than copying whole reports or treating them as current state. |
| Navigation and current state | Update the documentation map/reading paths and relevant README, engineering, task, backlog, and current-state links. Update roadmap status when this task actually completes. Keep approvals and actual check results in this task; preserve earlier task/ADR history. |

This delivery changes only Markdown documentation. Existing code, tests, scripts, manifests,
configuration examples, private environment files, and evidence artifacts remain unchanged.

## Required guide content

1. **Workload and ownership.** Explain the supported Ethereum USDC/WETH workload, the three venues,
   six configured USDC inputs, six directed distinct-pool routes, and 36 outcomes. Show the shared
   registry/snapshot → quotation → composition → eligibility → CLI flow, with source links; no
   independent collector or service is implied.
2. **Units and rounding.** Explain bigint base units, USDC/WETH decimals, address-based reserve and
   token direction, raw rational prices, range/headroom checks, and exact decimal-string JSON.
   Distinguish token amounts, wei, gas units, and USDC amounts from assumed USD value.
3. **V2 and V3 quotation.** Explain the implemented V2 fee-inclusive integer output with one final
   floor and deployed Router02 comparison. Explain official QuoterV2 inputs/returns, raw sqrt-price
   direction, and the supported full-input inference/limit boundary. Link pinned source provenance;
   do not reconstruct V3's swap engine or imply quotation proves executable transfer behavior.
4. **Qualification and composition.** Explain the exact fee-adjusted marginal reference and
   inclusive per-leg impact predicate, both-leg qualification at their actual inputs, leg two's
   exact first-leg output, and the full configured grid requirement. Separate outcome coverage,
   numeric completeness, qualification, origin, freshness, canonicality, and current admission.
5. **Gross ranking and cost boundary.** Explain signed final-minus-initial USDC gross and size/route
   tie breaks. Clarify that `absolute_usdc_gross_surplus` ranks signed USDC amounts, not magnitude
   of loss or ROI. Fees/impact are already in quoted output; slippage is not an extra deduction.
   Describe conditional accounting only with explicit evidence, upward cost conversion rounding,
   and its valuation assumptions. Current live costs/net profit remain unavailable; quoter gas
   cannot supply complete transaction cost.
6. **Lifecycle and honest states.** Explain one selected block/hash, policy/source/configuration
   provenance, collection versus quote budgets, use-time renewal, terminal invalidation, and
   unavailable validation. Explain fixture/historical origin, cancelled/rejected/incomplete/stale
   results, retained numeric diagnostics, and why archived monotonic times cannot restore live
   eligibility. An all-negative/zero usable gross grid differs from an unusable comparison.
7. **Worked examples and evidence.** Include a small set of exact, explicitly constructed examples
   drawn from independent tests: unit conversion, direction/flooring, composed outputs/signed gross,
   and an impact boundary. Trace each to source and test expectations. Separately walk through an
   actual archived CLI report with its original date/block/as-of; it is historical market evidence,
   not a promised repeatable market result or a current opportunity.
8. **Assumptions and remaining limits.** State the single-provider/read-only boundary, supported
   tokens/venues and qualification context, conditional valuation assumptions, and the distinction
   between code/source provenance and independent deployed-bytecode reproduction. Identify the
   remaining storage/service/UI, cost, executor/fork, provider/chain, and formal-verification work
   without implying a permanent project feature ceiling.

The guide explains existing behavior. CORRECTNESS and accepted ADRs remain authoritative for
requirements and decisions; source/tests establish what is implemented. If inspection exposes
a material disagreement, record the discrepancy and return for a bounded correction/decision.
This documentation task does not authorize changing production behavior to match prose.

## Outside scope

- Application code, test/helper/scaffold or script changes, new commands/flags or schemas,
  dependencies/toolchain upgrades, and a new calculation or cost producer.
- Changed financial/admission/ranking/freshness policy, venue/chain/provider selection, provider
  fallback, or retrospective rewriting of accepted decisions and approvals.
- New live RPC runs, archived market reports, historical replay, transaction/fork execution,
  wallets, storage, API/SSE, UI, process services, deployment, benchmarks, and CI/CD.
- M1-09 or later design/implementation, further commits, and pushes. The completed documentation
  commit and subsequent M1-09 scope preparation were separately requested; neither authorizes
  M1-09 design delivery or implementation.

## Acceptance criteria

- [x] The user approves this bounded M1-08 documentation-delivery scope.
- [x] The analysis guide and navigation provide a coherent entry path without competing sources
  for commands, requirements, decisions, or actual task evidence.
- [x] Implemented arithmetic, ranges, units, direction, rounding, impact/full-input predicates,
  composition, ranking, and conditional cost boundaries agree with existing source/tests/ADRs.
- [x] Constructed worked examples are independently checked, traceable, exact, and clearly
  separated from actual archived market observations and unavailable live net-profit evidence.
- [x] Result/lifecycle explanations preserve distinct coverage, qualification, origin, canonicality,
  freshness, admission, diagnostics, and cost states, including archive/as-of limitations.
- [x] Existing setup/help/fixture instructions are checked as described below; new check results
  are distinguished from earlier test counts, clean-install evidence, and live reports.
- [x] Evidence links identify original provenance and actual passed/failed/unverified boundaries;
  no new live result or full-M1 completion is inferred from documentation work.
- [x] Local links/anchors/requirement references and whitespace pass; only approved Markdown files
  change, and current state/task/backlog reflect the delivered result and remaining limits.

## Planned validation

This matrix defines the checks; actual results are recorded below.

| Case | Review/check |
| --- | --- |
| D01 — ownership/navigation | Follow README → guide → source/ADR/test/evidence links. Check for broken anchors, duplicated command/policy authority, and misleading statements about future architecture as implemented code. |
| D02 — mathematical agreement | Review every formula, unit, range, threshold, rounding and tie break against existing source and accepted ADRs. Independently recalculate each worked example with exact integer/rational arithmetic; do not generate the expected result solely by invoking the function it explains. |
| D03 — honest states | Check complete negative/zero and constructed positive gross, rejected/incomplete/stale/invalidated/unavailable/cancelled cases, diagnostic amounts, origin, and cost unavailability against shared backend/CLI behavior and existing tests. No new failure-injection system is needed. |
| D04 — usable commands | Check documented syntax against root scripts/help. Exercise existing help and fixture text/JSON commands using installed pinned tools, without live endpoint access; verify actual exits/parseability/labels. Check precedence/error/interrupt statements against existing tests. If setup instructions change materially, verify them in a clean copy with the unchanged frozen lockfile; do not add dependencies or repeat unrelated gates. |
| D05 — evidence traceability | Verify report fields and original dates/block/hash/as-of against the archived files; link the corresponding task results. Classify fixtures, injected live-mode tests, actual live observations, historical replay, and examples correctly. Preserve original artifacts and distinguish prior 158-test/clean-install evidence from new documentation checks. |
| D06 — scope/handoff | Check local Markdown links/anchors, CR references, whitespace, changed-file scope, and credential absence. Verify application/tests/manifests/lockfile/configuration/evidence remain unchanged; record actual outcomes and remaining limits without starting the next task. |

No new live run is needed to document an already recorded observation. Root behavioral tests
are not automatically repeated for Markdown-only changes; prior evidence is linked with its date
and scope. Any new command verification is recorded as such, never as a new production behavior
or integration pass. Do not invent current market output when explaining reproducibility.

## Approval record

- Documentation preparation: On 2026-11-18 the user said “prep m1-08”. This authorizes inspection,
  this proposed task record, and backlog/current-state navigation updates.
- Related design acceptance: ADR-0001/0004/0005/0006 are accepted; their records own those decisions.
- Documentation-delivery approval: Granted on 2026-11-18 for M1-08 only.
- Approved delivery scope and user instruction: “i accept”. This accepts the reviewed guide,
  navigation/consolidation work, and the stated documentation/command verification. It does
  not authorize application changes, new live runs, later tasks, commits, or pushes.
- Completion commit authorization: After delivery, the user said “commit and then prep m1-09”
  on 2026-11-18. This separately authorizes one commit of the completed M1-08 documentation,
  followed by M1-09 scope preparation. It does not authorize a push or storage implementation.

## Preparation history

Prepared for review on 2026-11-18 at Git HEAD `99fe048`. Read-only inspection covered the README,
documentation map/current state/workflow, correctness requirements, relevant ADR sections,
engineering conventions, source/command/configuration definitions, and M1-03/05/06/07 evidence.
The 158-test result, clean-install verification, and existing live reports remain prior evidence;
no behavioral tests, command smoke runs, live RPC, or dependency installation ran for preparation.

Only this task document and backlog/current-state links are prepared. The planned analysis guide
and documentation consolidation have not been created. No code/tests/configuration/evidence,
commit, push, or later task is introduced. Next action: review this bounded delivery scope.

Preparation checks passed: local links/anchors, defined CR references, and whitespace across
35 Markdown files (295 local links); unique D01–D06 cases; Proposed/unapproved delivery state;
`git diff --check`; exactly three documentation changes; unchanged Git HEAD `99fe048`; and no
staged files or premature analysis guide. Existing application/tests/configuration/evidence are unchanged.

## Evidence and handoff

Completed on 2026-11-18 under the explicit documentation approval above. Scope, approval,
delivery, and evidence updates were uncommitted at the first handoff, with Git HEAD `99fe048`.
The user then separately requested their commit and subsequent M1-09 scope preparation.
No push or later design/implementation was started during M1-08 delivery.

### Delivered documents

- [ANALYSIS.md](../ANALYSIS.md) explains the shared read-only pipeline, exact units/math, V2/V3
  direction and rounding, full-input/impact predicates, composition/ranking, conditional costs,
  qualification/eligibility/lifecycle, constructed examples, and actual archived CLI dependencies.
- The [root README](../../README.md) remains authoritative for setup/commands/configuration/exits.
  It links the guide and clarifies cycle-row versus leg-quote amount units. No command, setup step,
  tool version, flag, or environment precedence changed.
- The [documentation map](../README.md) assigns the guide its distinct explanation/interpretation
  role; [engineering](../ENGINEERING.md), roadmap, backlog, and current state link the delivered
  behavior and retain the remaining M1 boundaries. Requirements and accepted ADR text/history are
  unchanged. This documentation completion does not complete M1-09 through M1-12.

### Actual D01–D06 checks

| Case | Actual result on 2026-11-18 |
| --- | --- |
| D01 | README/map/engineering lead to the guide, then existing requirements, ADRs, source/tests, task records, and archived evidence. Setup and CLI ownership remains in the README; task records retain actual check results. |
| D02 | Reviewed formulas/units/ranges/limits against current domain, protocol, backend, CLI, and accepted ADRs. Independent Python integer/`fractions.Fraction` calculations verified both unequal-reserve V2 vectors, two constructed mixed-unit cycles, raw/whole-token V3 ratio conversion, exact fee-500/3000 impact endpoints, and the fractional ideal's adjacent outcomes. No expected value was generated solely by calling production functions. |
| D03 | Cross-checked shared eligibility/CLI code and existing domain/analysis/CLI regressions for signed negative/zero/positive gross, diagnostics, rejected/incomplete/stale/invalidated/unavailable/cancelled states, and costs. The guide distinguishes the full-input predicate from positive-output qualification, and unavailable final validation from numeric quote completeness. No behavior or tests changed. |
| D04 | Actual `bun run cli --help`, `bun run cli --help --format json`, `bun run cli --mode fixture`, and `bun run cli --mode fixture --format json` each exited 0. JSON stdout parsed as one `cli-v1` document; text/JSON fixture runs retained all 36 rows, constructed origin, unavailable costs, and no live admission. `bun run check:toolchain` passed Node 26.3.1/Bun 1.3.11. |
| D05 | Read the original archived M1-03/05/06 JSON/text. Verified selected blocks, actual replay/expiry flags, M1-05 V2 comparison equality, the CLI's exact as-of/validation/IDs/hash/leg linkage/gross, and the text run's different block. All evidence files remain byte-identical to HEAD. Prior M1-07's 158-test/clean-install evidence is labeled as prior, with no new live run implied. |
| D06 | Local links/anchors/CR references, whitespace, changed-file scope, credential absence, and unchanged source/tests/manifests/lockfile/configuration/evidence are verified at handoff. No new runtime contract or application artifact was introduced. |

The four command checks used invalid unused process overrides for the live URL/provider labels;
help also received an invalid size setting to confirm that it does not load application config.
Fixture runs used the documented six-size grid and the existing constructed transport. No live
mode or integration harness ran. Temporary stdout/stderr was kept outside the repository in
`/private/tmp/pooltrace-m1-08-_5uib3wn`; no new report was added to `docs/evidence` or `data`.
Fixture JSON was usable as constructed evidence at **2026-11-18T14:14:11.530Z**, with best gross
**-0.034985 USDC** for 10 USDC via V3-500 → V3-3000. This is separate from the guide's asymmetric
constructed test profile and the actual archived live observation.

The pinned official V2 library, V3 pool, QuoterV2, and TickMath sources linked in the guide were
reread on 2026-11-18. They support the protocol expression, sqrt representation, tuple/returned
evidence, and the stated full-input inference. Existing reviewed revisions were retained; no
deployment, source version, or runtime metadata was upgraded. No source/bytecode audit is claimed.

### Reuse and limits

No root behavioral suite or clean dependency installation was repeated: only Markdown changed,
and setup commands/versions/lockfile were not materially altered. The actual 158-test and clean
install results belong to [M1-07](M1-07-validation-and-regression-coverage.md#evidence-and-handoff).
There are no new behavioral/integration test results and no new live chain observations in M1-08.
No required documentation check remains failed or unverified.

The guide's live example describes the original recorded event, not current eligibility, profit,
execution, or capture. Constructed marginal V3 responses remain adapter/composition inputs, not
an independently implemented swap engine. Full transaction costs/net production and execution
remain later work; storage/API/UI/process lifecycle remains M1-09 through M1-12.

The next proposed action is preparing the bounded M1-09 SQLite design scope for review. It has
not started; this documentation task does not authorize driver selection, schema/migrations,
dependencies, database creation, code, or any later task.

Final handoff checks passed: local links/anchors and CR references across 36 Markdown files
(347 local links), whitespace, `git diff --check`, D01–D06/acceptance coverage, and credential scans
of all eight changed/new documents. Application/source/tests/scripts/manifests/configuration and
archived evidence are unchanged; lockfile and supplied brand hashes match the prior baseline.
Pre-commit Git HEAD was `99fe048`, with no staged files or commit/push during delivery.
