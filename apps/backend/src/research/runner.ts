import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  type Clock,
  type Fetch,
  type Header,
  POLICY,
  REGISTRY,
  QUOTE_SOURCE,
  RpcFailure,
  RpcSession,
  safeReason,
  systemClock,
} from "@pooltrace/protocols";
import { QUOTE_POLICY } from "@pooltrace/domain";
import { analysisEligibility } from "../analysis.ts";
import { loadCliEnvironment, runCli } from "../cli-runner.ts";
import { readConfig } from "../config.ts";
import { acquireProducer } from "../producer-guard.ts";
import { EvidenceStore } from "../storage/store.ts";
import {
  type Category,
  type Event,
  Journal,
  type Manifest,
  ResearchError,
  SETTINGS,
  SIZES,
  type Settings,
  sourceIdentity,
  type Stamp,
} from "./model.ts";
import { RunTransport } from "./transport.ts";
import { continuationPlan } from "./continuation.ts";
import { buildRunReport } from "./report.ts";

export interface ResearchDependencies {
  root: string;
  env: Readonly<Record<string, string | undefined>>;
  outputDir?: string;
  signal?: AbortSignal;
  clock?: Clock;
  fetch?: Fetch;
  progress?: (value: unknown) => void;
  continueFrom?: string;
  // Injected fixture runs cannot be requested through the live CLI or pass as live evidence.
  fixture?: { settings: Settings; source: Manifest["source"] };
}
export async function runExperiment(deps: ResearchDependencies) {
  const clock = deps.clock ?? systemClock;
  const stamp = (): Stamp => ({ wall: clock.wall(), mono: clock.mono() });
  const env = loadCliEnvironment(deps.root, deps.env);
  const config = readConfig(
    deps.fixture
      ? {
          ETHEREUM_RPC_URL: "https://fixture.invalid",
          RPC_PROVIDER_LABEL: "constructed-fixture",
          RPC_CONFIG_REVISION: "diagnostic-fixture-v1",
        }
      : env,
  );
  const settings = deps.fixture?.settings ?? SETTINGS;
  const continuation = deps.continueFrom
    ? continuationPlan(deps.continueFrom, deps.root, undefined, config)
    : undefined;
  if (deps.continueFrom) {
    const prior = buildRunReport(deps.continueFrom);
    if (prior.windows.length !== 1 || prior.windows[0]?.coverage.canonicalUnknown !== 0)
      throw new ResearchError("continuation_not_eligible");
  }
  if (continuation && deps.fixture) throw new ResearchError("configuration");
  const preflightMs = continuation?.preflightMsRemaining ?? settings.preflightMs;
  const preflightSends = continuation?.preflightSendsRemaining ?? settings.preflightSends;
  if (
    settings.windows !== 2 ||
    !Object.values(settings).every((v) => Number.isSafeInteger(v) && v > 0) ||
    settings.reserveMs >= settings.windowMs ||
    settings.reserveSends >= settings.sends
  )
    throw new ResearchError("configuration");
  const runId = randomUUID();
  const outputDir = resolve(deps.root, deps.outputDir ?? `data/arb-01-${runId}`);
  mkdirSync(dirname(outputDir), { recursive: true, mode: 0o700 });
  mkdirSync(outputDir, { mode: 0o700 }); // Exclusive run directory; never overwrite/resume evidence.
  const controller = new AbortController();
  const signal = deps.signal
    ? AbortSignal.any([deps.signal, controller.signal])
    : controller.signal;
  let journal: Journal | undefined;
  let guard: ReturnType<typeof acquireProducer> | undefined;
  let store: EvidenceStore | undefined;
  let reason = "complete";
  let completedWindows = 0;
  let journalFailed = false;
  let cleanup = true;
  const append = (event: Event, sync = false) => {
    try {
      return journal?.append(event, sync);
    } catch {
      journalFailed = true;
      controller.abort();
      throw new ResearchError("journal_failure");
    }
  };
  const progress = (value: unknown) => deps.progress?.(value);
  const source = () => deps.fixture?.source ?? sourceIdentity(deps.root);
  const frozenSource = source();
  const verifySource = () => {
    if (source().sha256 !== frozenSource.sha256) throw new ResearchError("source_changed");
  };
  const overallTimer = setTimeout(
    () => {
      reason = "experiment_time_limit";
      controller.abort();
    },
    continuation
      ? Math.max(1, continuation.originalDeadlineWall - clock.wall())
      : settings.preflightMs + settings.windows * settings.windowMs,
  );
  const pause = async (ms: number, stop: AbortSignal) => {
    if (stop.aborted) throw new RpcFailure("cancelled");
    await delay(ms, undefined, { signal: stop });
  };
  try {
    journal = new Journal(join(outputDir, "journal.jsonl"));
    guard = acquireProducer(join(outputDir, "evidence.sqlite"));
    store = new EvidenceStore(guard.dbPath);
    const manifest: Manifest = {
      format: "arb-01-v1",
      runId,
      origin: deps.fixture ? "fixture" : "live",
      created: stamp(),
      source: frozenSource,
      runtime: {
        node: process.version,
        bun: execFileSync("bun", ["--version"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim(),
      },
      providerLabel: config.providerLabel,
      configurationRevision: config.configurationRevision,
      settings,
      sizes: SIZES,
      policies: { snapshot: POLICY, quotation: QUOTE_POLICY },
      registry: REGISTRY,
      quoteSource: QUOTE_SOURCE,
      ...(continuation ? { continuation } : {}),
    };
    append({ kind: "manifest", manifest }, true);
    progress({ phase: "preflight", runDirectory: outputDir });
    let phase: Category = "collection";
    let attemptIndex = 0;
    async function attempt(window: number, transport: RunTransport, stop: AbortSignal) {
      const started = stamp();
      const bounded = transport.fetchFor(() => phase);
      const result = await runCli(
        [
          "--mode",
          deps.fixture ? "fixture" : "live",
          "--format",
          "json",
          "--sizes",
          JSON.stringify(SIZES),
        ],
        {
          root: deps.root,
          env: { ...env, POOLTRACE_DB_PATH: guard?.dbPath },
          readFile: () => undefined,
          clock,
          signal: stop,
          fetch: bounded,
          ...(deps.fixture ? { fixtureFactory: () => ({ fetch: bounded }) } : {}),
          onPhase: (value) => {
            phase = value;
          },
          onLogicalRead: () => transport.logical(phase),
          ...(guard ? { producerGuard: guard } : {}),
          ...(store ? { persistentStore: store } : {}),
        },
      );
      const value = result.envelope;
      if (!value) throw new ResearchError("pipeline_unavailable");
      const completed = stamp();
      const state = value.analysis
        ? analysisEligibility(value.analysis, {
            wall: () => completed.wall,
            mono: () => completed.mono,
          })
        : null;
      append({
        kind: "attempt",
        window,
        index: attemptIndex++,
        started,
        completed,
        observationRevision: value.persistence.collectionRevisionId,
        analysisRevision: value.persistence.lastSavedAnalysisRevisionId,
        status: value.status,
        reason: value.reason,
        persistence: value.persistence.status,
        state,
      });
      if (journalFailed) throw new ResearchError("journal_failure");
      if (
        !store?.available ||
        value.persistence.status !== "saved" ||
        value.persistence.reason ||
        value.reason === "producer_unavailable"
      )
        throw new ResearchError(value.persistence.reason ?? "storage_unavailable");
      if (value.observation?.chainId !== null && value.observation?.chainId !== 1n)
        throw new ResearchError("configuration");
      if (
        [...(value.analysis?.observation.requests ?? value.observation?.requests ?? [])].some(
          (r) => r.outcome === "authorization" || r.outcome === "configuration",
        )
      )
        throw new ResearchError("rpc_configuration");
      progress({
        phase: "attempt",
        window,
        block: value.observation?.block?.number.toString() ?? null,
        status: value.status,
        qualifiedAtCompletion: state?.workloadAdmitted ?? false,
        sends: transport.sends,
      });
      return value;
    }
    const preflightStart = clock.mono();
    const preflightStop = new AbortController();
    const preflightTimer = setTimeout(() => preflightStop.abort(), preflightMs);
    const preflight = new RunTransport(
      0,
      preflightSends,
      0,
      preflightStart + preflightMs,
      clock,
      append,
      deps.fetch,
    );
    try {
      const first = await attempt(0, preflight, AbortSignal.any([signal, preflightStop.signal]));
      if (
        !first.observation?.complete ||
        !first.observation.registry ||
        !first.analysis ||
        first.observation.registry.identity !== "passed" ||
        first.observation.registry.structural !== "passed" ||
        first.observation.capabilities.length !== 2 ||
        !first.observation.capabilities.every((c) => c.positive && c.unknownHashRejected)
      )
        throw new ResearchError("preflight_failed");
    } finally {
      clearTimeout(preflightTimer);
      append(
        {
          kind: "window-end",
          window: 0,
          at: stamp(),
          reason: "preflight_closed",
          sends: preflight.sends,
          maxActive: preflight.maxActive,
        },
        true,
      );
    }
    let previousEnd = continuation?.previousEnd ?? -1n;
    for (let window = continuation ? 2 : 1; window <= settings.windows; window++) {
      if (signal.aborted) throw new ResearchError("cancelled");
      verifySource();
      const armed = stamp();
      const hardStop = new AbortController();
      const collectStop = new AbortController();
      const observerStop = new AbortController();
      const hardSignal = AbortSignal.any([signal, hardStop.signal]);
      const collectSignal = AbortSignal.any([hardSignal, collectStop.signal]);
      const transport = new RunTransport(
        window,
        settings.sends,
        settings.reserveSends,
        armed.mono + settings.windowMs,
        clock,
        append,
        deps.fetch,
      );
      const hardTimer = setTimeout(() => hardStop.abort(), settings.windowMs);
      const collectTimer = setTimeout(
        () => collectStop.abort(),
        settings.windowMs - settings.reserveMs,
      );
      let observer: Promise<void> | undefined;
      let windowReason = "window_end";
      async function header(
        number: bigint | "latest",
        category: Category,
        stop: AbortSignal,
        chain = false,
      ) {
        const session = new RpcSession({
          url: config.rpcUrl,
          clock,
          signal: stop,
          fetch: transport.fetchFor(() => category),
          maxReads: 3,
          maxSends: 6,
          onLogicalRead: () => transport.logical(category),
        });
        try {
          if (chain && (await session.chain()) !== 1n) throw new ResearchError("configuration");
          const value = await session.block(number);
          if (number !== "latest" && value.number !== number) throw new RpcFailure("malformed");
          return value;
        } finally {
          session.close();
        }
      }
      try {
        const head = await header("latest", "control", hardSignal, true);
        const start = head.number + 2n > previousEnd + 1n ? head.number + 2n : previousEnd + 1n;
        const end = start + BigInt(settings.blocks) - 1n;
        previousEnd = end;
        append({ kind: "window", window, armed, head, start, end }, true);
        progress({ phase: "window", window, start: start.toString(), end: end.toString() });
        let latest: Header | null = null;
        const observerSignal = AbortSignal.any([collectSignal, observerStop.signal]);
        observer = (async () => {
          while (!observerSignal.aborted) {
            let value: Header | null = null;
            let failure: string | null = null;
            const pollStart = clock.mono();
            try {
              value = await header("latest", "observer", observerSignal);
              latest = value;
            } catch (error) {
              failure = safeReason(error);
              if (["authorization", "configuration", "unsupported"].includes(failure)) {
                reason = "rpc_configuration";
                controller.abort();
              }
            }
            append({ kind: "head", window, at: stamp(), header: value, reason: failure });
            if (value && value.number > end) break;
            try {
              await pause(
                Math.max(1, settings.pollMs - (clock.mono() - pollStart)),
                observerSignal,
              );
            } catch {
              break;
            }
          }
        })().catch(() => {
          controller.abort();
        });
        while (!collectSignal.aborted && transport.sends < settings.sends - settings.reserveSends) {
          const observed = latest as Header | null;
          if (observed && observed.number > end) break;
          if (!observed || observed.number < start) {
            try {
              await pause(settings.pollMs, collectSignal);
            } catch {
              break;
            }
            continue;
          }
          const result = await attempt(window, transport, collectSignal);
          if (result.observation?.block && result.observation.block.number > end) break;
          try {
            await pause(settings.delayMs, collectSignal);
          } catch {
            break;
          }
        }
        if (signal.aborted)
          throw new ResearchError(journalFailed ? "journal_failure" : "cancelled");
        if (collectStop.signal.aborted) windowReason = "collection_time_limit";
        else if (transport.sends >= settings.sends - settings.reserveSends)
          windowReason = "collection_send_limit";
        observerStop.abort();
        await observer;
        transport.closing = true;
        for (let height = start; height <= end; height++) {
          let value: Header | null = null;
          let failure: string | null = null;
          try {
            value = await header(height, "reconciliation", hardSignal, true);
          } catch (error) {
            if (error instanceof ResearchError) throw error;
            failure = safeReason(error);
          }
          append({
            kind: "canonical",
            window,
            at: stamp(),
            height,
            header: value,
            reason: failure,
          });
          if (hardSignal.aborted || transport.sends >= settings.sends) break;
        }
        if (hardStop.signal.aborted) windowReason = "window_time_limit";
        if (transport.sends >= settings.sends) windowReason = "window_send_limit";
        verifySource();
        completedWindows++;
      } catch (error) {
        windowReason = error instanceof ResearchError ? error.reason : safeReason(error);
        throw error;
      } finally {
        observerStop.abort();
        collectStop.abort();
        await observer;
        clearTimeout(hardTimer);
        clearTimeout(collectTimer);
        hardStop.abort();
        append(
          {
            kind: "window-end",
            window,
            at: stamp(),
            reason: windowReason,
            sends: transport.sends,
            maxActive: transport.maxActive,
          },
          true,
        );
        progress({ phase: "window-closed", window, reason: windowReason, sends: transport.sends });
      }
    }
  } catch (error) {
    reason = journalFailed
      ? "journal_failure"
      : reason !== "complete"
        ? reason
        : signal.aborted
          ? "cancelled"
          : error instanceof ResearchError
            ? error.reason
            : safeReason(error);
  } finally {
    clearTimeout(overallTimer);
    try {
      store?.close();
    } catch {
      cleanup = false;
    }
    try {
      guard?.release();
    } catch {
      cleanup = false;
    }
    if (!cleanup && reason === "complete") reason = "cleanup_incomplete";
    try {
      append({ kind: "end", at: stamp(), reason, windows: completedWindows, cleanup }, true);
    } catch {
      reason = "journal_failure";
    }
    try {
      journal?.close();
    } catch {
      reason = "journal_failure";
    }
  }
  progress({ phase: "closed", reason, windows: completedWindows, cleanup });
  return { outputDir, reason, windows: completedWindows, cleanup };
}
