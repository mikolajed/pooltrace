# 0008: Local API, SSE, and application process interface

- Status: Proposed
- Proposed on: 2026-11-18
- Decision accepted by user: Not yet
- Related task records: [M1-11](../tasks/M1-11-local-api-sse-and-browser.md),
  [M1-12](../tasks/M1-12-local-startup-readiness-and-shutdown.md)
- Requirement IDs: CR-01, CR-03, CR-05, CR-06, CR-09, CR-10, CR-11; preserve CR-02/04
  in [CORRECTNESS.md](../CORRECTNESS.md)
- Supersedes / superseded by: None; refines ADR-0001/0004 and the service-coexistence question in ADR-0007

## Context

M1-10 supplies one-shot CLI collection/analysis and exact SQLite history. There is no application
HTTP server, SSE stream, browser package, recurring collector, or combined launcher. M1 needs local
browser access to backend-owned results and a reliable way to start and stop both applications.

[ADR-0004](0004-local-processes-and-gated-deployment.md) already selects a UI process and one
backend owning RPC, collection, analysis, storage, and API updates. Individual application commands
and the combined launcher need consistent configuration, readiness, and shutdown behavior. Each
application must also remain usable without the combined launcher.

Two source details need explicit treatment. The current CLI opens the same default evidence file
directly; SQLite transaction locking alone does not establish one collector owner. Stored `History`
objects deliberately carry historical context and no current best; loading them cannot restore
live admission. Neither issue can be solved by the launcher or browser alone.

## Proposed decision

All names, endpoints, defaults, and behavior below are **proposals**, not implemented commands or
existing APIs. Accepting the ADR selects the design; implementation approval belongs to each task.
The shared process interface is versioned `local-process-v1`; the read API is `local-api-v1`.

### 1. Application responsibilities

| Component | Responsibility |
| --- | --- |
| Backend, `apps/backend` | Collection, analysis, SQLite, read API/SSE, backend readiness and graceful shutdown; service and diagnostic CLI share the producer guard |
| Browser application, `apps/web` | Presentation, public connection configuration, web readiness, and its own process/descendant lifecycle; no collection or database authority |
| Local launcher, `scripts/local` | Start the applications, verify readiness, report failures, and stop only its owned process groups; no collector or database ownership |

Use the existing Bun workspace and pinned Node runtime. Frontend dependencies need compatible exact
pins and a reviewed Bun lockfile. The local launcher adds no external dependency. Application and
launcher checks use isolated ports, temporary evidence files, and owned processes.

### 2. Commands, configuration, and readiness

| Proposed root command | Meaning |
| --- | --- |
| `bun run dev:backend --mode live` or `--mode fixture` | Start the backend alone on pinned Node; mode is required and fixture is never a live fallback |
| `bun run dev:web --mode live` or `--mode fixture` | Start the minimal Next.js UI alone on Node, using public local connection configuration |
| `bun run dev --mode live` or `--mode fixture` | M1-12 foreground launcher starts and supervises both applications |
| Existing `bun run cli --mode live\|fixture` | Remains a one-shot diagnostic command, subject to the producer guard below |

The root scripts remain Bun entry points. The launcher invokes fixed executable/argument arrays
using the pinned Node executable, without a shell or nested Bun command wrappers. It uses the same
application entry points as the individual commands. No generic process-management framework,
daemon installation, automatic restart, production hosting, or Anvil process is included.

Define stable Node-launchable entry points. Paths below are relative to the repository root;
both child working directories are that absolute root.

| Application | Node argument array after the executable | Application-owned bootstrap responsibility |
| --- | --- | --- |
| Backend | `apps/backend/src/server.ts`, `--mode`, `live` or `fixture` | Validate configuration, acquire ownership, initialize store/service, listen and schedule |
| Web | `apps/web/dev.ts`, `--mode`, `live` or `fixture` | Validate public configuration, resolve the pinned Next CLI from the web workspace, start it with project directory `apps/web`, hostname `127.0.0.1` and configured port; forward signals/exit and retain foreground ownership |

The web bootstrap is application code. Its Next child and workers must remain in the process group
supplied by the launcher; do not detach or unref them. Standalone web startup must also clean up
its own descendants. Changing these entry paths/argv is a process interface change. Root scripts
invoke the same Node entries; the
launcher does not parse shell strings from `package.json` to discover them.

| Setting | Proposed rule |
| --- | --- |
| Binding | Both applications bind explicitly to `127.0.0.1`; no public/network-interface mode in this task |
| Ports | `POOLTRACE_BACKEND_PORT=4317`, `POOLTRACE_WEB_PORT=4318`; configurable distinct integers 1024–65535, no automatic port substitution |
| Backend configuration | Existing root-file/process precedence for RPC labels, endpoint, six sizes, and `POOLTRACE_DB_PATH`; relative evidence paths remain repository-root-relative with existing live/fixture defaults |
| Collection delay | `POOLTRACE_COLLECTION_DELAY_MS=10000`, integer 1000–300000; measured after an attempt finishes, not a promise of observation freshness or provider capacity |
| Process identity | Fresh nonsecret UUID `POOLTRACE_RUN_ID` generated for every launcher invocation; individual apps generate one when absent. Each app bootstrap generates its own `instanceId`; web passes it only to its Next child as `POOLTRACE_INSTANCE_ID` |
| UI connection | Nonsecret `POOLTRACE_API_ORIGIN`, default `http://127.0.0.1:<backend port>`; require that exact configured loopback backend origin. Expected mode comes from the required `--mode` argument and is passed internally as `POOLTRACE_MODE` |
| UI environment | Only `POOLTRACE_API_ORIGIN`, `POOLTRACE_BACKEND_PORT`, `POOLTRACE_WEB_PORT`, `POOLTRACE_RUN_ID`, and ordinary runtime essentials reach the web bootstrap; it adds its validated `POOLTRACE_MODE`/`POOLTRACE_INSTANCE_ID` for Next. No RPC values, provenance labels, size grid, or database paths |
| Readiness timing | Per-child 60000 ms monotonic deadline, probes every 250 ms with a 1000 ms request timeout, all capped by the deadline |
| Shutdown timing | 10000 ms graceful period for owned groups, then force termination of remaining owned groups and at most 5000 ms further wait; incomplete cleanup is reported |

Invalid/duplicate/unknown arguments, invalid mode/ports/delay, and invalid required configuration
fail before collection or child spawning. The launcher may read private configuration to validate
and pass it to the backend, but never echoes it or passes it to the UI. Fixture mode needs no live
credentials. Individual commands and launcher use equivalent configuration rules; standalone web
loads only the named public keys, never a general root environment into the Next child.

Web exposes uncached `GET /api/config` with only `contractVersion: local-process-v1`, `apiOrigin`,
`expectedMode`, and `runId`. Read the bootstrap-validated public configuration at request time.
The browser obtains connection settings there rather than relying on build-inlined `NEXT_PUBLIC_`
values, and rejects a backend mode mismatch. This route does not expose private settings or
proxy backend/RPC traffic. It also makes a built UI's connection configuration explicit at runtime.

Both applications expose uncached `GET /healthz`. A ready response is HTTP 200 with only
`contractVersion`, `application` (`backend` or `web`), `runId`, `instanceId`, and `phase: ready`.
Use HTTP 503 while stopping or if readiness is withdrawn. Backend readiness requires validated
configuration, producer ownership, initialized/verified storage, bound HTTP, and initialized
collector lifecycle. Web readiness requires its application server and root view to be serveable.
RPC success, market admission, a positive gross result, and net-profit availability are separate
market states. A running backend can therefore be ready with unavailable market data.

The launcher starts backend first, verifies its role/version/run identity and that the owned child
is still alive, then starts and verifies web and its root response. A pre-existing listener, even
one returning HTTP 200, cannot satisfy ownership. Bind failures or mismatched identity cause failure
and cleanup of the launcher's children; it never adopts or signals the listener already on a port.

Use exit 2 for usage/configuration failure, 1 for startup/runtime/cleanup failure, 130 after SIGINT,
and 143 after SIGTERM. Help exits 0 without I/O. The existing CLI's documented exit meanings remain
unchanged. Market unavailability alone does not terminate an otherwise operational service.

### 3. One producer, bounded collection, and current eligibility

M1-11 introduces a small exclusive producer guard shared by the service and the existing CLI before
opening their store or starting RPC. Key it to the canonical local database path. Propose an
exclusive sidecar file (`<database>.owner`, mode 0600) created with exclusive-create semantics,
containing a random ownership token and nonsecret process metadata. Canonicalize symlink paths;
reject hard-linked database aliases rather than pretending path-based ownership covers them.
For a missing database/parent, resolve the nearest existing ancestor, create required local parent
directories with the existing 0700 policy, then canonicalize the actual parent before exclusive
sidecar creation; do not create/open the database to acquire the guard. Recheck path identity and
supported aliases before store opening; an identity change fails closed. Existing aliases resolving
to one file must resolve to one guard. This is not a guarantee against concurrent external renames.
The guard is held until work stops and owned database handles close. Release only the matching
owned sidecar; a second owner fails explicitly before collection. Add its ignore pattern during
implementation. SQLite settings/schema and transaction semantics remain ADR-0007's.

An existing, malformed, or crash-left sidecar fails closed. Do not steal it based on elapsed time
or a PID check, kill a recorded PID, remove another owner's file, or delete evidence. Document a
manual stale-guard procedure requiring verification that the producer has stopped. This is local
coordination among Pooltrace entry points, not protection against external SQLite tools, filesystem
tampering, network filesystems, or old binaries that do not participate in the guard.

Use one backend scheduler and one active collection/analysis pipeline. First attempt follows
readiness; subsequent attempts start after the configured completion delay. There is no overlap,
catch-up queue, browser-triggered collection, or per-subscriber RPC work. Retain accepted per-attempt
RPC concurrency, retry, hash, deadline, logical-read, and send limits. Each new attempt has a new
identity and block selection; do not silently retry a failed analysis at a different block.

Reuse the existing producers and ADR-0007 save ordering. At publication permit at most the existing
bounded use-time renewal/save path for the newly completed attempt. Save status remains independent
of numerical/market status; confirmed revision IDs appear only after confirmed saves. An unsaved or
uncertain result may be diagnostic but cannot be presented as durably recorded. Failure of the
collection save prevents analysis; fatal storage/ownership loss stops collection, withdraws backend
readiness, and exits for the launcher to report. No automatic reopening/recovery loop is included.
Current admission/best requires a confirmed final save and readable invalidation status; otherwise
retain numerical diagnostics with their independent calculation/save states and no current best.

Recompute the in-memory current view after persistence, on reads, and on status ticks using the
current backend clock and known invalidation overlay. Respect every accepted age, clock, canonicality,
coverage, and qualification gate. No HTTP or SSE request calls RPC. M1-11 does not keep an old
analysis admitted through repeated background renewals: once its validation or age expires, remove
current admission/best until a new attempt qualifies. Thus a connected UI may legitimately show
gaps in live eligibility. Do not present eligibility beyond ADR-0005's five-second validation limit
without fresh validation, or revive terminally invalidated observations.

On process restart there is no restored current analysis. History remains available immediately
after readiness and is labeled historical, preserving original origin/as-of evidence and known
invalidation. Never cast retrieved `History.value` into a live producer or restore monotonic clocks.

### 4. Narrow read API and exact presentation

| Proposed GET endpoint | Behavior |
| --- | --- |
| `/api/v1/current` | Current service/collector state and current in-memory analysis projection, independent persistence receipt, as-of eligibility, expiry information, and source revision references; honest null/empty initial state |
| `/api/v1/history/observations` | Existing bounded observation metadata list |
| `/api/v1/history/analyses` | Existing bounded analysis metadata list |
| `/api/v1/history/observations/:revisionId` | Exact observation-version historical detail and known invalidation |
| `/api/v1/history/analyses/:revisionId` | Exact analysis-version historical detail and known invalidation |
| `/api/v1/events` | SSE status/change notifications described below |

Responses identify `local-api-v1`, backend instance, and as-of time. Current views also identify a
monotonic view sequence within the instance. IDs are opaque, validated exact revision IDs, never
paths. Lists expose existing limit (default 20, maximum 100), origin/parent filters appropriate to
the list, and high-water/last-sequence cursor semantics; validate queries and preserve filters during
pagination. No offset scan, arbitrary SQL, file/path endpoint, mutation, execution, or RPC proxy.
Use 400 for invalid input, 404 for absent exact versions, 405 for unsupported methods, 503 for
unavailable storage/service capacity, and fixed sanitized error reasons.

Financial quantities remain exact decimal integer strings with explicit units/decimals. Preserve
all 36 outcomes, zero versus unavailable, signed gross, the accepted ranking metric/tie breaks,
origins, block number/hash/timestamp, observation/as-of times, qualification, and cost/net
unavailability. Label the best tested gross result and any historical as-of ranking separately
from current admission. No new gas/cost producer, SQL ranking, or financial recalculation in web.

Bind requests to the configured loopback Host and allow browser Origin only for the configured web
origin; do not use wildcard CORS or credentials. Origin-less local readiness/diagnostic reads are
allowed. Configure browser fetch/EventSource without credentials and responses with no-store.
Validate input length/shape and bound request, response, connection, and history-read work; return
explicit capacity/size failures rather than truncating evidence. API/log/browser output excludes
RPC URLs, keys, local paths, raw SQL, raw errors, and provider response bodies. These localhost
checks are not a design for hosted authentication or untrusted multi-user access.

### 5. SSE resynchronization and minimal browser view

Use browser-native EventSource. Every connection, including reconnect with `Last-Event-ID`, first
receives a complete **status projection**, with backend instance/view sequence, mode, collector
state, current analysis/revision references, save state, as-of verdict, and eligibility expiry.
It does not stream full observation/analysis payloads. Send the same projection on meaningful
changes and at least once per second while connected; ticks recompute local age/eligibility without
RPC. Browser retrieves `/current` on initial connection/change and discards responses older than
its latest instance/sequence. Instance changes reset its current view; history selection remains
explicitly historical. Coalesce fetches so status ticks do not accumulate overlapping requests.

SSE IDs combine the instance and sequence, distinct from storage revision IDs. There is no durable
event log or replay guarantee; a reconnect always resynchronizes from the current projection/API.
Use `text/event-stream`, UTF-8, no-store, and a proposed 1000 ms retry hint. Bound to 16 clients,
64 KiB per status frame, and 128 KiB queued output per client. Respect Node backpressure, coalesce
pending status, and disconnect clients exceeding bounds or failing to drain within 5000 ms.
Connection rejection and slow-client cleanup must not block collection or grow an unbounded queue.

Only a completed `/current` request can confirm current admission; an SSE frame can withdraw it
or request a refresh, but cannot grant it or extend a deadline. `/current` returns the remaining
validity in milliseconds at its server as-of event, capped by every applicable gate. Record the
browser's monotonic time **before sending** the request and anchor that remaining duration there,
subtracting the entire request elapsed time. Do not start a new interval on response/frame receipt;
discard an already-expired or superseded response. This is conservative about transport delay.

The browser removes current-eligibility presentation on stream error, after 3000 ms without status,
and at that conservative validity deadline, whichever comes first. Do not trust the browser wall
clock. Recheck on visibility/focus after suspension and require a fresh `/current` confirmation;
reconnect alone does not revive eligibility. The last payload can remain visible as dated
diagnostics. No browser clock or local calculation grants admission.

Create `apps/web` with the selected Next.js/React direction, minimal styling and browser-specific
TypeScript configuration. Research/pin compatible frontend versions before authorized installation;
keep existing backend/toolchain pins. A material incompatibility needs review, not a silent upgrade.
Do not import the backend's native SQLite/Node exports into the client. Wire data can use narrow
type-only definitions without introducing a generic shared-contract package.

The minimal view contains connection/collection/save state, an explicit fixture banner, the 36-row
route/size table, exact gross amounts, best tested gross where eligible, unavailable cost/net,
block provenance/age, and bounded historical list/detail access. Include clear initial, empty,
all-negative, partial/rejected, unavailable, stale, invalidated, disconnected, and historical states.
Preserve CR-11's financial color meaning and basic keyboard/readability behavior. Rich charts,
terminal layout, brand assets, simulation controls, and broader M4 work remain separately scoped.

### 6. Shutdown, failure handling, and integration gate

Each application owns its signal handlers. For backend shutdown, stop scheduling, withdraw readiness,
cancel current RPC, retain confirmed saves and use at most the accepted terminal save path, then
close SSE/listeners and owned storage. Release the producer guard last. Repeated signals must not
start duplicate cleanup.
Synchronous SQLite/filesystem work may delay handlers; deadlines do not promise immediate I/O
interruption. On a forced stop, surviving owner metadata stays fail-closed for manual review.

The local launcher is a foreground supervisor. On startup failure, child failure after readiness,
SIGINT, or SIGTERM, stop both owned applications, allow the graceful period, then escalate only owned
process groups. Spawn without a shell, retain child/group handles, drain/bound output, and wait
for actual exit/closure; a successful signal send alone is not proof of termination. Never search
processes by name, kill by port, adopt a user-managed service, or signal a PID from a stale file.
No automatic restart loop is included. Initial process-group support targets the available macOS
host; other operating systems remain unverified and unsupported launch modes must fail explicitly.

Validate launcher failure handling with isolated controlled child processes, and validate the
complete workflow with the actual backend and web. Required integration evidence includes
Bun-to-Node startup/signals, correct identity/readiness, browser/API/SSE behavior, and owned-descendant
cleanup. Passing process fixtures alone is insufficient evidence that the application workflow works.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Put application readiness and graceful shutdown in the launcher | Couples application lifecycle to the combined startup command; keep each application independently usable and let the launcher supervise it |
| Let standalone CLI collect beside the service | SQLite can serialize writes, but that does not meet one authoritative collector ownership; fail clearly on a competing owner |
| Proxy API/SSE through Next.js | Can avoid CORS, but adds a streaming/caching hop; use explicit loopback origins for this narrow local slice |
| Durable SSE replay or continuous eligibility-renewal scheduler | More recovery/RPC coordination than this slice needs; use current-state resynchronization and withdraw expired eligibility |
| External supervisor or container framework | Adds dependency/deployment scope; use a small owned local launcher |

## Consequences

Applications own their lifecycle and the launcher consumes a stable process interface. Full workflow
validation requires the real applications in addition to controlled failure cases. Conservative expiry
can leave gaps in current admission, and fail-closed producer ownership can require manual cleanup
after a crash. Continuous collection grows retained evidence without retention automation; stop the foreground service when
unused. This design makes no throughput, sustained freshness, recovery, hardware durability,
cross-platform, hosted-security, profitability, or capture claim.

## Acceptance and validation criteria

The task records own the detailed planned matrices. Review requires coherent ownership, matching
commands/configuration/readiness/signals, truthful current/history/save states, bounded clients/RPC,
and a real-application integration gate. No check in this record is evidence of implemented behavior.

## Official sources and research limits

Consulted on 2026-11-18; these establish upstream mechanisms, not Pooltrace compatibility results:

- [Node child processes](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options)
  documents direct spawning, process groups on non-Windows systems, and child lifecycle caveats.
- [Node HTTP](https://nodejs.org/api/http.html#responsewritechunk-encoding-callback) documents
  streamed writes/backpressure; application queue limits and cleanup still need verification.
- [Node filesystem flags](https://nodejs.org/api/fs.html#file-system-flags) documents exclusive
  create behavior. A sidecar is application coordination, not an operating-system database lock.
- [Next CLI](https://nextjs.org/docs/app/api-reference/cli/next) documents development invocation
  and explicit hostname/port options; do not rely on the framework's network-binding default.
- [Next environment variables](https://nextjs.org/docs/app/guides/environment-variables) explains
  browser inlining; only public local connection data can enter the web environment/bundle.
- [Next route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) provides
  the mechanism for the web readiness route; verify uncached behavior with the selected version.
- [WHATWG SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html) defines EventSource,
  reconnect, event IDs, and stream framing; it does not provide a durable application replay log.

The live Node documentation identified patch 26.13.1 during this review; Pooltrace stays pinned to
26.3.1. The attempted `docs/latest-v26.x` URLs were unavailable in the research tool; the linked
API pages were readable. Verify selected APIs on the actual pin during implementation. No new
dependency version, native load, process signal, HTTP response, SSE behavior, or frontend build
has been tested by this documentation work.

## Approval record

Design acceptance: Pending. Documentation preparation does not accept this proposed decision or
authorize implementation. The related task records own implementation approval.

## Implementation and evidence

Implementation pending. Documentation preparation and actual documentation checks are recorded in
the linked M1-11/M1-12 task records. Source inspection and design review are not executed application
tests or implementation evidence.
