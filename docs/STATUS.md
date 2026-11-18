# Current state

Updated: 2026-11-18.

## Phase and authorization

**M1-01 through M1-12 are complete. ADRs 0001–0008 are accepted.**

The user accepted ADR-0008 and approved both implementation scopes with “ok i think we can do it
now i accept ad8 and m1-11 and m1-12” on 2026-11-18. The completed
[M1-11 task](tasks/M1-11-local-api-sse-and-browser.md#implementation-evidence) and
[M1-12 task](tasks/M1-12-local-startup-readiness-and-shutdown.md#implementation-evidence) own
approval, actual validation and limitations. Earlier task records retain their own evidence.
[WORKFLOW.md](WORKFLOW.md) governs later work. On 2026-11-18 the user requested the completion
commit with “commit”; no later milestone, push or deployment is authorized.

## What exists

- One local backend owns bounded RPC, immutable snapshots/analysis, all 36 route/size outcomes,
  canonicality/freshness checks, serial collection, exact SQLite evidence, read API and SSE.
- A minimal Next.js/React browser shows exact gross amounts, unavailable costs/net, provenance,
  save/connection/collector state, and bounded observation/analysis history. Current presentation
  expires conservatively; historical evidence never restores live admission.
- `bun run dev --mode fixture|live` starts both applications with identity-bearing readiness,
  isolated configuration and owned shutdown. Individual commands remain available. The foreground
  launcher supports the verified macOS host; native SQLite was validated on macOS arm64.
- The diagnostic live/fixture CLI uses the same backend modules and per-database producer guard.
  CLI and service cannot produce concurrently on the same evidence file. Both preserve independent
  calculation/save status and exact confirmed revision IDs.
- The pinned Bun/Node workspace passes **262 offline tests across 12 files**, type/lint/format
  checks, a credential-free clean frozen-lockfile installation/check, and the production web build.
- Actual fixture/live browser and API checks, native SIGINT/130 and SIGTERM/143 shutdown, competing
  CLI refusal, closed listeners, ownership release and historical reopen are recorded in the tasks.
  The archived live API event had 36 qualified saved outcomes at block 26444090; its best tested
  gross was negative and costs/net were unavailable. It is historical evidence now.
- The [analysis guide](ANALYSIS.md) explains implemented math, lifecycle interpretation and evidence.
  The [root README](../README.md#local-application) owns setup, commands and recovery boundaries.
  The supplied perched kingfisher reference remains unchanged.

## Remaining boundaries

Qualification belongs to each observation/input/policy. Reports and screenshots are as-of events,
not continuing live eligibility, profitability or capture claims. Collection does not depend on
browser refresh/navigation and HTTP/SSE requests do not invoke RPC.

No wallet, executor, transaction submission, fork simulation, full-transaction cost producer,
benchmark, hosted deployment or CI pipeline exists. Executor/Anvil/cost evidence remains M2;
richer history/replay/recovery/backup remains M3. Provider fallback/gateway and additional chains
retain their separate backlog scopes. Other platforms, power loss, network filesystems, exhaustive
browser suspension/network stress and sustained freshness/performance remain unverified.

## Latest handoff and next proposed action

The user requested a completion commit containing M1-11/M1-12 implementation, evidence archives
and documentation. All owned QA applications were stopped. The preceding documentation checkpoint
is `08f5a47` (`docs: prepare M1-11 and M1-12 scopes and clarify agent coordination`).

Review the completed diff and task evidence. A later increment, such as M2 executor design, needs
its own scope and explicit approval; it has not started.
