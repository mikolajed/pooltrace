import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { routes, parseSizes } from "@pooltrace/domain";
import { POLICY, REGISTRY, QUOTE_SOURCE, type Header } from "@pooltrace/protocols";
import { QUOTE_POLICY } from "@pooltrace/domain";
import { type Analysis, type CycleRow, analysisEligibility } from "../analysis.ts";
import { digest } from "../storage/codec.ts";
import { connect } from "../storage/driver.ts";
import { assertAnalysis, assertObservation } from "../storage/evidence.ts";
import { EvidenceStore } from "../storage/store.ts";
import type { Observation } from "../snapshot.ts";
import {
  type Attempt,
  type Event,
  type Manifest,
  type Stamp,
  CATEGORIES,
  ResearchError,
  SETTINGS,
  SIZES,
  hashBytes,
  object,
  readJournal,
  stampValid,
  validElapsed,
} from "./model.ts";

type WindowEvent = Extract<Event, { kind: "window" }>;
type HeadEvent = Extract<Event, { kind: "head" }>;
type CanonicalEvent = Extract<Event, { kind: "canonical" }>;
export interface Sample {
  event: Attempt;
  block: Header | null;
  admitted: boolean;
  invalidated: boolean;
  rows: readonly CycleRow[];
  quoteMs: number | null;
  collectionMs: number | null;
  clockInvalid: boolean;
}
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
function isHeader(value: Header | null): boolean {
  return (
    value !== null &&
    typeof value.number === "bigint" &&
    value.number >= 0n &&
    typeof value.timestamp === "bigint" &&
    value.timestamp >= 0n &&
    hashPattern.test(value.hash) &&
    hashPattern.test(value.parentHash)
  );
}
export function numberStats(values: number[]) {
  if (values.some((v) => !Number.isFinite(v) || v < 0)) throw new ResearchError("timing_corrupt");
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p: number) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? null;
  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    p50: rank(0.5),
    p95: rank(0.95),
    max: sorted.at(-1) ?? null,
  };
}
export function amountStats(values: bigint[]) {
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    p50: sorted[Math.max(0, Math.ceil(sorted.length / 2) - 1)] ?? null,
    p95: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
    max: sorted.at(-1) ?? null,
    positive: values.filter((v) => v > 0n).length,
    zero: values.filter((v) => v === 0n).length,
    negative: values.filter((v) => v < 0n).length,
  };
}
function disposition(sample: Sample) {
  if (sample.invalidated || sample.event.state?.canonical === "invalidated") return "invalidated";
  if (
    sample.clockInvalid ||
    !sample.event.state ||
    sample.event.state.canonical !== "valid" ||
    sample.event.state.freshness === "unavailable"
  )
    return "validation_unavailable";
  if (sample.event.state.freshness === "stale" || sample.event.state.validationExpired)
    return "stale";
  if (sample.rows.some((r) => r.status === "rejected")) return "rejected";
  if (!sample.event.state.quotesComplete) return "incomplete";
  return "validation_unavailable";
}
export function summarizeWindow(
  window: WindowEvent,
  settings: Manifest["settings"],
  samples: Sample[],
  heads: HeadEvent[],
  canonical: CanonicalEvent[],
  clockInvalid = false,
) {
  const byHeight = new Map<string, CanonicalEvent>();
  for (const event of canonical) {
    if (
      event.height < window.start ||
      event.height > window.end ||
      byHeight.has(event.height.toString())
    )
      throw new ResearchError("canonical_corrupt");
    byHeight.set(event.height.toString(), event);
  }
  const inconsistent = new Set<string>();
  for (let height = window.start + 1n; height <= window.end; height++) {
    const previous = byHeight.get((height - 1n).toString())?.header;
    const current = byHeight.get(height.toString())?.header;
    if (previous && current && current.parentHash !== previous.hash) {
      inconsistent.add(height.toString());
      inconsistent.add((height - 1n).toString());
    }
  }
  const firstSeen = new Map<string, Stamp>();
  for (const event of heads)
    if (event.header && !firstSeen.has(event.header.hash))
      firstSeen.set(event.header.hash, event.at);
  const coverage = {
    qualified: 0,
    attemptedIneligible: 0,
    seenNotAttempted: 0,
    notSeenNotAttempted: 0,
    canonicalUnknown: 0,
  };
  const ineligible: Record<string, number> = {};
  const financial: { sample: Sample; rows: readonly CycleRow[] }[] = [];
  const timing = {
    collection: [] as number[],
    quotes: [] as number[],
    completion: [] as number[],
    firstSeenToCompletion: [] as number[],
    age: [] as number[],
    lag: [] as number[],
  };
  let seen = 0,
    duplicates = 0,
    orphanedAttempts = 0,
    invalidTiming = 0,
    firstSeenUnavailable = 0;
  const details: {
    height: bigint;
    hash: string | null;
    category: string;
    reason: string | null;
    primary: number | null;
    attempts: number;
    rows: readonly CycleRow[];
  }[] = [];
  for (let height = window.start; height <= window.end; height++) {
    const closing = byHeight.get(height.toString());
    const header = inconsistent.has(height.toString()) ? null : closing?.header;
    if (!header) {
      coverage.canonicalUnknown++;
      details.push({
        height,
        hash: null,
        category: "canonical_unknown",
        reason: inconsistent.has(height.toString())
          ? "closing_chain_inconsistent"
          : (closing?.reason ?? "not_reconciled"),
        primary: null,
        attempts: samples.filter((s) => s.block?.number === height).length,
        rows: [],
      });
      continue;
    }
    const candidates = samples
      .filter((s) => s.block?.number === height && s.block.hash === header.hash)
      .sort((a, b) => a.event.index - b.event.index);
    orphanedAttempts += samples.filter(
      (s) => s.block?.number === height && s.block.hash !== header.hash,
    ).length;
    duplicates += Math.max(0, candidates.length - 1);
    const observerTime = firstSeen.get(header.hash);
    if (observerTime) seen++;
    const primary = candidates[0];
    let category: string;
    let failure: string | null = null;
    if (!primary) {
      category = observerTime ? "seen_not_attempted" : "not_seen_not_attempted";
      if (observerTime) coverage.seenNotAttempted++;
      else coverage.notSeenNotAttempted++;
    } else {
      if (primary.admitted && !primary.invalidated && !clockInvalid && !primary.clockInvalid) {
        category = "qualified";
        coverage.qualified++;
        financial.push({ sample: primary, rows: primary.rows });
      } else {
        category = "attempted_ineligible";
        coverage.attemptedIneligible++;
        failure = clockInvalid ? "validation_unavailable" : disposition(primary);
        ineligible[failure] = (ineligible[failure] ?? 0) + 1;
      }
      if (
        !clockInvalid &&
        !primary.clockInvalid &&
        validElapsed(primary.event.started, primary.event.completed)
      ) {
        if (primary.collectionMs !== null) timing.collection.push(primary.collectionMs);
        if (primary.quoteMs !== null) timing.quotes.push(primary.quoteMs);
        timing.completion.push(primary.event.completed.mono - primary.event.started.mono);
        if (observerTime && validElapsed(observerTime, primary.event.completed))
          timing.firstSeenToCompletion.push(primary.event.completed.mono - observerTime.mono);
        else firstSeenUnavailable++;
        const state = primary.event.state;
        if (state?.blockAgeMs !== null && state?.blockAgeMs !== undefined)
          timing.age.push(state.blockAgeMs);
        if (state?.headLag !== null && state?.headLag !== undefined && /^\d+$/.test(state.headLag))
          timing.lag.push(Number(state.headLag));
      } else invalidTiming++;
    }
    details.push({
      height,
      hash: header.hash,
      category,
      reason: failure,
      primary: primary?.event.index ?? null,
      attempts: candidates.length,
      rows: primary?.rows ?? [],
    });
  }
  const routesReport = routes().flatMap((route) =>
    parseSizes(SIZES).map((input) => {
      const rows = financial.flatMap((f) =>
        f.rows.filter(
          (r) => r.route[0] === route[0] && r.route[1] === route[1] && r.input === input,
        ),
      );
      return {
        route,
        inputUsdcBase: input,
        grossUsdcBase: amountStats(rows.flatMap((r) => (r.gross === null ? [] : [r.gross]))),
      };
    }),
  );
  const best = financial.map(({ sample, rows }) => {
    const sorted = [...rows].sort((a, b) => {
      if (a.gross !== b.gross) return (a.gross ?? 0n) > (b.gross ?? 0n) ? -1 : 1;
      if (a.input !== b.input) return a.input < b.input ? -1 : 1;
      return a.route[0] - b.route[0] || a.route[1] - b.route[1];
    });
    const value = sorted[0];
    if (!value || value.gross === null) throw new ResearchError("grid_corrupt");
    return {
      block: sample.block,
      route: value.route,
      inputUsdcBase: value.input,
      grossUsdcBase: value.gross,
    };
  });
  const positiveBlocks = best.filter((b) => b.grossUsdcBase > 0n).length;
  const stats = {
    collectionMs: numberStats(timing.collection),
    quoteMs: numberStats(timing.quotes),
    completionMs: numberStats(timing.completion),
    firstSeenToCompletionMs: numberStats(timing.firstSeenToCompletion),
    completionBlockAgeMs: numberStats(timing.age),
    completionHeadLag: numberStats(timing.lag),
  };
  return {
    window: window.window,
    start: window.start,
    end: window.end,
    armed: window.armed,
    denominator: settings.blocks,
    coverage,
    ineligible,
    observerSeenCanonical: seen,
    duplicates,
    orphanedAttempts,
    attemptsWithoutBlock: samples.filter((s) => !s.block).length,
    outOfWindowAttempts: samples.filter(
      (s) => s.block && (s.block.number < window.start || s.block.number > window.end),
    ).length,
    positiveGrossBlocks: positiveBlocks,
    positiveGrossRate: coverage.qualified
      ? { numerator: positiveBlocks, denominator: coverage.qualified }
      : null,
    qualifiedCoverage: { numerator: coverage.qualified, denominator: settings.blocks },
    grossUsdcBase: amountStats(best.map((b) => b.grossUsdcBase)),
    routes: routesReport,
    bestTestedByBlock: best,
    timing: stats,
    invalidTiming,
    firstSeenUnavailable,
    clockInvalid,
    pollReceiptGapMs: numberStats(
      heads.slice(1).flatMap((h, i) => {
        const prior = heads[i];
        return prior && validElapsed(prior.at, h.at) ? [h.at.mono - prior.at.mono] : [];
      }),
    ),
    targets: {
      observerCoverage: seen * 100 >= settings.blocks * 90,
      qualifiedCoverage: coverage.qualified * 100 >= settings.blocks * 75,
      quoteP95: stats.quoteMs.p95 === null ? null : stats.quoteMs.p95 <= 10_000,
      headLagP95: stats.completionHeadLag.p95 === null ? null : stats.completionHeadLag.p95 <= 1,
    },
    blocks: details,
  };
}

export function buildRunReport(directory: string) {
  const journal = readJournal(join(directory, "journal.jsonl"));
  const first = journal.events[0];
  if (
    first?.kind !== "manifest" ||
    journal.events.filter((e) => e.kind === "manifest").length !== 1
  )
    throw new ResearchError("manifest_corrupt");
  const manifest = first.manifest;
  object(manifest);
  if (
    manifest.format !== "arb-01-v1" ||
    !["live", "fixture"].includes(manifest.origin) ||
    digest(manifest.sizes) !== digest(SIZES) ||
    !stampValid(manifest.created) ||
    digest(manifest.policies) !== digest({ snapshot: POLICY, quotation: QUOTE_POLICY }) ||
    digest(manifest.registry) !== digest(REGISTRY) ||
    digest(manifest.quoteSource) !== digest(QUOTE_SOURCE) ||
    (manifest.origin === "live" && digest(manifest.settings) !== digest(SETTINGS))
  )
    throw new ResearchError("manifest_incompatible");
  if (
    manifest.source.sha256 !==
    digest({
      head: manifest.source.head,
      patchSha256: manifest.source.patchSha256,
      files: manifest.source.files,
    })
  )
    throw new ResearchError("source_identity_corrupt");
  const database = join(directory, "evidence.sqlite");
  if (!statSync(database).isFile()) throw new ResearchError("evidence_missing");
  const databaseHash = hashBytes(readFileSync(database));
  const store = new EvidenceStore(database, (path) => connect(path, true));
  try {
    const windows = journal.events.filter((e): e is WindowEvent => e.kind === "window");
    const ends = journal.events.filter(
      (e): e is Extract<Event, { kind: "window-end" }> => e.kind === "window-end",
    );
    const terminal = journal.events.at(-1);
    if (journal.events.some((e, i) => e.kind === "end" && i !== journal.events.length - 1))
      throw new ResearchError("journal_order_corrupt");
    for (const [index, window] of windows.entries()) {
      if (
        window.window !== index + (manifest.continuation ? 2 : 1) ||
        !isHeader(window.head) ||
        !stampValid(window.armed) ||
        typeof window.start !== "bigint" ||
        window.end !== window.start + BigInt(manifest.settings.blocks) - 1n ||
        window.start !==
          (window.head.number + 2n >
          (windows[index - 1]?.end ?? manifest.continuation?.previousEnd ?? -1n) + 1n
            ? window.head.number + 2n
            : (windows[index - 1]?.end ?? manifest.continuation?.previousEnd ?? -1n) + 1n)
      )
        throw new ResearchError("window_corrupt");
    }
    if (windows.length > 2) throw new ResearchError("window_corrupt");
    const counters = new Map<
      number,
      {
        sends: number;
        replies: Set<number>;
        logical: Record<string, number>;
        byCategory: Record<string, number>;
        failures: Record<string, number>;
        retries: number;
      }
    >();
    const clockBad = new Set<number>();
    let previousStamp = manifest.created;
    let nextAttempt = 0;
    for (const event of journal.events.slice(1)) {
      const at = "at" in event ? event.at : event.kind === "attempt" ? event.completed : null;
      if (at) {
        if (!stampValid(at)) throw new ResearchError("timing_corrupt");
        if (!validElapsed(previousStamp, at) && "window" in event) clockBad.add(event.window);
        previousStamp = at;
      }
      if ("window" in event && (!count(event.window) || event.window > manifest.settings.windows))
        throw new ResearchError("window_corrupt");
      if (event.kind === "head" || event.kind === "canonical") {
        if (event.header !== null && !isHeader(event.header))
          throw new ResearchError("header_corrupt");
        if (
          event.kind === "canonical" &&
          (typeof event.height !== "bigint" ||
            (event.header && event.header.number !== event.height))
        )
          throw new ResearchError("canonical_corrupt");
      }
      if (
        event.kind === "attempt" &&
        (event.index !== nextAttempt++ ||
          !stampValid(event.started) ||
          !stampValid(event.completed))
      )
        throw new ResearchError("attempt_corrupt");
      if (["send", "reply", "logical"].includes(event.kind)) {
        if (!("window" in event)) throw new ResearchError("rpc_corrupt");
        let counter = counters.get(event.window);
        if (!counter) {
          counter = {
            sends: 0,
            replies: new Set(),
            logical: {},
            byCategory: {},
            failures: {},
            retries: 0,
          };
          counters.set(event.window, counter);
        }
        if (event.kind === "send") {
          if (
            !CATEGORIES.includes(event.category) ||
            event.id !== counter.sends + 1 ||
            typeof event.method !== "string" ||
            !count(event.retry) ||
            event.retry < 1 ||
            event.retry > POLICY.maxSends
          )
            throw new ResearchError("rpc_corrupt");
          counter.sends++;
          if (event.retry > 1) counter.retries++;
          counter.byCategory[event.category] = (counter.byCategory[event.category] ?? 0) + 1;
        } else if (event.kind === "logical") {
          if (!CATEGORIES.includes(event.category)) throw new ResearchError("rpc_corrupt");
          counter.logical[event.category] = (counter.logical[event.category] ?? 0) + 1;
        } else if (event.kind === "reply") {
          if (
            !count(event.id) ||
            event.id < 1 ||
            event.id > counter.sends ||
            counter.replies.has(event.id) ||
            typeof event.outcome !== "string"
          )
            throw new ResearchError("rpc_corrupt");
          counter.replies.add(event.id);
          if (event.outcome !== "http_200")
            counter.failures[event.outcome] = (counter.failures[event.outcome] ?? 0) + 1;
        }
      } else if (
        !["window", "head", "canonical", "attempt", "window-end", "end"].includes(event.kind)
      )
        throw new ResearchError("journal_corrupt");
    }
    const loaded: Sample[] = [];
    const readerOutcomes = new Map<number, Record<string, number>>();
    for (const event of journal.events)
      if (event.kind === "attempt") {
        let observation: Observation | null = null;
        if (event.observationRevision) {
          const value = store.getObservation(event.observationRevision).value;
          assertObservation(value);
          observation = value;
          if (
            observation.providerLabel !== manifest.providerLabel ||
            observation.configurationRevision !== manifest.configurationRevision ||
            observation.origin !== manifest.origin
          )
            throw new ResearchError("configuration_mismatch");
        }
        let analysis: Analysis | null = null;
        let invalidated = false;
        if (event.analysisRevision) {
          const history = store.getAnalysis(event.analysisRevision);
          assertAnalysis(history.value);
          analysis = history.value;
          invalidated = history.knownInvalidation !== null;
          if (
            !observation ||
            analysis.observation.attemptId !== observation.attemptId ||
            digest(analysis.sizes) !== digest(parseSizes(SIZES))
          )
            throw new ResearchError("reference_mismatch");
          const state = analysisEligibility(analysis, {
            wall: () => event.completed.wall,
            mono: () => event.completed.mono,
          });
          if (digest(state) !== digest(event.state))
            throw new ResearchError("eligibility_mismatch");
          const grid = routes().flatMap((route) =>
            parseSizes(SIZES).map((input) => ({ route, input })),
          );
          const quotes = new Map(analysis.quotes.map((q) => [q.quoteId, q]));
          for (const [i, row] of analysis.rows.entries()) {
            if (digest({ route: row.route, input: row.input }) !== digest(grid[i]))
              throw new ResearchError("grid_corrupt");
            if (row.output !== null && row.gross !== row.output - row.input)
              throw new ResearchError("gross_corrupt");
            if (row.status === "passed") {
              const a = quotes.get(row.leg1 ?? ""),
                b = quotes.get(row.leg2 ?? "");
              if (
                !a ||
                !b ||
                a.input !== row.input ||
                b.input !== a.output ||
                row.output !== b.output ||
                !a.fullInput ||
                !b.fullInput
              )
                throw new ResearchError("composition_corrupt");
            }
          }
        } else if (event.state !== null) throw new ResearchError("reference_mismatch");
        const block = analysis?.observation.block ?? observation?.block ?? null;
        const outcomes = readerOutcomes.get(event.window) ?? {};
        for (const request of analysis?.observation.requests ?? observation?.requests ?? [])
          outcomes[request.outcome] = (outcomes[request.outcome] ?? 0) + 1;
        readerOutcomes.set(event.window, outcomes);
        loaded.push({
          event,
          block,
          admitted:
            manifest.origin === "live" &&
            event.status === "usable" &&
            event.persistence === "saved" &&
            event.state?.workloadAdmitted === true,
          invalidated,
          rows: analysis?.rows ?? [],
          quoteMs: analysis?.elapsedMs ?? null,
          collectionMs: observation?.elapsedMs ?? null,
          clockInvalid:
            !validElapsed(event.started, event.completed) ||
            analysis?.clockInvalid === true ||
            observation?.clockInvalid === true,
        });
      }
    const summaries = windows.map((window) =>
      summarizeWindow(
        window,
        manifest.settings,
        loaded.filter((s) => s.event.window === window.window),
        journal.events.filter(
          (e): e is HeadEvent => e.kind === "head" && e.window === window.window,
        ),
        journal.events.filter(
          (e): e is CanonicalEvent => e.kind === "canonical" && e.window === window.window,
        ),
        clockBad.has(window.window),
      ),
    );
    const rpc = [...counters].map(([window, counter]) => {
      const ending = ends.filter((e) => e.window === window);
      if (
        ending.length > 1 ||
        (ending[0] &&
          (ending[0].sends !== counter.sends ||
            !count(ending[0].maxActive) ||
            ending[0].maxActive > 4))
      )
        throw new ResearchError("rpc_count_mismatch");
      if (
        counter.sends > (window === 0 ? manifest.settings.preflightSends : manifest.settings.sends)
      )
        throw new ResearchError("rpc_budget_exceeded");
      return {
        window,
        sends: counter.sends,
        logicalReads: counter.logical,
        sendsByCategory: counter.byCategory,
        retrySends: counter.retries,
        unresolvedSends: counter.sends - counter.replies.size,
        transportFailures: counter.failures,
        pipelineReaderOutcomes: readerOutcomes.get(window) ?? {},
        observerFailures: journal.events
          .filter((e) => e.kind === "head" && e.window === window && e.reason !== null)
          .reduce<Record<string, number>>((values, e) => {
            if (e.kind === "head" && e.reason) values[e.reason] = (values[e.reason] ?? 0) + 1;
            return values;
          }, {}),
        maxActive: ending[0]?.maxActive ?? null,
        stopReason: ending[0]?.reason ?? "unclosed",
      };
    });
    const complete =
      terminal?.kind === "end" &&
      terminal.reason === "complete" &&
      terminal.cleanup &&
      terminal.windows === (manifest.continuation ? 1 : 2) &&
      summaries.length === (manifest.continuation ? 1 : 2) &&
      summaries.every((w) => w.coverage.canonicalUnknown === 0);
    return {
      format: "arb-01-report-v1",
      origin: manifest.origin,
      manifest,
      complete,
      terminal: terminal?.kind === "end" ? terminal : null,
      artifacts: {
        journalSha256: journal.sha256,
        journalTerminalDigest: journal.terminalDigest,
        databaseSha256: databaseHash,
      },
      units: {
        amounts: "USDC base units (10^-6 USDC)",
        elapsed: "milliseconds",
        percentiles: "nearest rank, ceil(p*n), no interpolation",
      },
      windows: summaries,
      rpc,
      recurrence:
        summaries[0]?.routes
          .filter(
            (r) =>
              r.grossUsdcBase.positive > 0 &&
              summaries[1]?.routes.some(
                (other) =>
                  digest(other.route) === digest(r.route) &&
                  other.inputUsdcBase === r.inputUsdcBase &&
                  other.grossUsdcBase.positive > 0,
              ),
          )
          .map((r) => ({ route: r.route, inputUsdcBase: r.inputUsdcBase })) ?? [],
      transactionCost: "unavailable",
      netProfit: "unavailable",
      providerBilling: "unavailable",
      conclusion:
        complete && summaries.every((w) => Object.values(w.targets).every((v) => v === true))
          ? "baseline_targets_met"
          : "baseline_inconclusive_or_targets_missed",
      limitations: [
        "End-of-block state cannot reveal every intra-block opportunity.",
        "First seen is local HTTP observer receipt, not network arrival or block creation.",
        "Observer work shares the RPC budget/concurrency and can affect measured timing.",
        "Canonicality is as of recorded checks, without a finality or capture guarantee.",
        "Missing or ineligible blocks do not establish zero market yield.",
        "Complete reproduction requires the retained journal and SQLite evidence.",
        "Pipeline reader outcomes include expected unknown-hash capability probes and dispatch refusals; they are separate from actual transport sends.",
      ],
    };
  } finally {
    store.close();
  }
}
export function buildReport(directory: string) {
  const current = buildRunReport(directory);
  const continuation = current.manifest.continuation;
  if (!continuation) return { ...current, interruption: null };
  const prior = buildRunReport(continuation.priorDirectory);
  const proof = readFileSync(join(continuation.priorDirectory, "source-recovery.json"));
  if (
    hashBytes(proof) !== continuation.recoverySha256 ||
    prior.artifacts.journalSha256 !== continuation.parentJournalSha256 ||
    prior.artifacts.databaseSha256 !== continuation.parentDatabaseSha256 ||
    prior.manifest.runId !== continuation.parentRunId ||
    prior.windows.length !== 1 ||
    prior.windows[0]?.coverage.canonicalUnknown !== 0 ||
    current.windows[0]?.start === undefined ||
    current.windows[0].start <= continuation.previousEnd ||
    current.manifest.providerLabel !== prior.manifest.providerLabel ||
    current.manifest.configurationRevision !== prior.manifest.configurationRevision ||
    digest(current.manifest.settings) !== digest(prior.manifest.settings) ||
    digest(current.manifest.policies) !== digest(prior.manifest.policies)
  )
    throw new ResearchError("continuation_mismatch");
  const totalSends = [...prior.rpc, ...current.rpc].reduce((sum, r) => sum + r.sends, 0);
  const preflightSends = [...prior.rpc, ...current.rpc]
    .filter((r) => r.window === 0)
    .reduce((sum, r) => sum + r.sends, 0);
  if (
    preflightSends > SETTINGS.preflightSends ||
    totalSends > SETTINGS.preflightSends + SETTINGS.sends * SETTINGS.windows ||
    (current.terminal && current.terminal.at.wall > continuation.originalDeadlineWall)
  )
    throw new ResearchError("original_budget_exhausted");
  const windows = [...prior.windows, ...current.windows];
  return {
    ...current,
    windows,
    rpc: [...prior.rpc, ...current.rpc],
    complete: current.complete,
    interruption: {
      priorRunId: prior.manifest.runId,
      originalTerminal: prior.terminal,
      sourceRecovery: JSON.parse(proof.toString("utf8")),
      firstWindowSource: prior.manifest.source,
      firstWindowArtifacts: prior.artifacts,
      sourceComparison: continuation.sourceComparison,
      matchedSourceComparison: false,
      totalSends,
      preflightSends,
    },
    recurrence:
      windows[0]?.routes
        .filter(
          (r) =>
            r.grossUsdcBase.positive > 0 &&
            windows[1]?.routes.some(
              (other) =>
                digest(other.route) === digest(r.route) &&
                other.inputUsdcBase === r.inputUsdcBase &&
                other.grossUsdcBase.positive > 0,
            ),
        )
        .map((r) => ({ route: r.route, inputUsdcBase: r.inputUsdcBase })) ?? [],
    conclusion:
      current.complete && windows.every((w) => Object.values(w.targets).every((v) => v === true))
        ? "baseline_targets_met_with_recorded_interruption"
        : "baseline_inconclusive_or_targets_missed",
  };
}
export function reportMarkdown(report: ReturnType<typeof buildReport>) {
  const lines = [
    "# ARB-01 baseline research",
    "",
    `Origin: ${report.origin}. Evidence complete: ${report.complete}.`,
    "",
    `Conclusion: ${report.conclusion}.`,
    "",
    "| Window | Blocks | Qualified | Observer seen | Positive gross blocks |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const window of report.windows)
    lines.push(
      `| ${window.window} | ${window.start}–${window.end} | ${window.coverage.qualified}/${window.denominator} | ${window.observerSeenCanonical}/${window.denominator} | ${window.positiveGrossBlocks}/${window.coverage.qualified || "unavailable"} |`,
    );
  lines.push(
    "",
    "Transaction costs, net profit and provider billing are unavailable.",
    "",
    ...report.limitations.map((value) => `- ${value}`),
  );
  return `${lines.join("\n")}\n`;
}
