import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setImmediate as yieldToLoop } from "node:timers/promises";
import { parseArgs, parseEnv } from "node:util";
import { DomainError, parseSizes } from "@pooltrace/domain";
import {
  type Clock,
  type Fetch,
  jsonEvidence,
  safeReason,
  systemClock,
} from "@pooltrace/protocols";
import {
  type Analysis,
  analysisEligibility,
  analyzeSnapshot,
  prepareAnalysisForUse,
} from "./analysis.ts";
import { readConfig } from "./config.ts";
import { acquireProducer, type ProducerGuard, ProducerOwnershipError } from "./producer-guard.ts";
import { collectSnapshot, type Observation } from "./snapshot.ts";
import { StorageError, storageReason } from "./storage/driver.ts";
import { databasePath, EvidenceStore, type SaveReceipt, type Witness } from "./storage/store.ts";

type Mode = "live" | "fixture";
type Format = "text" | "json";
type Status =
  | "usable"
  | "rejected"
  | "incomplete"
  | "stale"
  | "invalidated"
  | "unavailable"
  | "cancelled"
  | "configuration_error";
export const HELP = `Pooltrace CLI — one read-only analysis attempt

Usage: bun run cli --mode live|fixture [--format text|json] [--sizes JSON]
       bun run cli --help [--format text|json]

--mode    Required for analysis. Fixture mode is constructed, offline data.
--format  Text by default; JSON emits one cli-v2 envelope with decimal-string integers.
--sizes   Six positive increasing USDC decimal strings as a JSON array.
--help    Show help without reading application configuration or making RPC calls.

Sizes: --sizes, then USDC_INPUT_AMOUNTS, then 10/50/100/500/1000/5000 USDC.
Live settings: root .env, then .env.local, then process environment.
Keep ETHEREUM_RPC_URL private in environment configuration; no URL argument is accepted.
Fixture mode needs no valid live URL and never uses it. All fixture state/time is constructed.
Results rank gross surplus. Transaction costs and net profit remain unavailable.
A service or CLI already owning the evidence file causes producer_unavailable; never remove an active owner file.
Persistence: defaults to data/pooltrace.sqlite (live) or data/pooltrace-fixture.sqlite (fixture).
POOLTRACE_DB_PATH overrides the path through the same root-file/process precedence.
Exit: 0 usable and saved/help; 1 unusable/runtime/storage failure; 2 usage/configuration; 130 interrupted.
Help accepts only --format; combining it with --mode or --sizes is invalid.`;
class UsageError extends Error {
  readonly reason: "usage" | "size_configuration" | "configuration" | "environment";
  constructor(reason: UsageError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}
export function parseCli(args: readonly string[]) {
  try {
    const parsed = parseArgs({
      args: [...args],
      options: {
        mode: { type: "string" },
        format: { type: "string" },
        sizes: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
      allowPositionals: false,
      tokens: true,
    });
    const seen = new Set<string>();
    for (const token of parsed.tokens)
      if (token.kind === "option") {
        if (seen.has(token.name)) throw new UsageError("usage");
        seen.add(token.name);
      }
    const format = parsed.values.format ?? "text";
    if (format !== "text" && format !== "json") throw new UsageError("usage");
    if (parsed.values.help) {
      if (parsed.values.mode !== undefined || parsed.values.sizes !== undefined)
        throw new UsageError("usage");
      return { help: true, mode: null, format, sizesRaw: undefined } as const;
    }
    const mode = parsed.values.mode;
    if (mode !== "live" && mode !== "fixture") throw new UsageError("usage");
    return { help: false, mode, format, sizesRaw: parsed.values.sizes } as const;
  } catch {
    throw new UsageError("usage");
  }
}
export function loadCliEnvironment(
  root: string,
  env: Readonly<Record<string, string | undefined>>,
  read: (path: string) => string | undefined = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
      throw new UsageError("environment");
    }
  },
): Readonly<Record<string, string | undefined>> {
  let local: Record<string, string | undefined> = {};
  try {
    for (const name of [".env", ".env.local"]) {
      const content = read(resolve(root, name));
      if (content !== undefined) local = { ...local, ...parseEnv(content) };
    }
  } catch {
    throw new UsageError("environment");
  }
  return {
    ...local,
    ...Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined)),
  };
}
function configuredSizes(raw: string | undefined) {
  let value: unknown;
  try {
    value = raw === undefined ? undefined : JSON.parse(raw);
  } catch {
    throw new UsageError("size_configuration");
  }
  if (value !== undefined && (!Array.isArray(value) || !value.every((v) => typeof v === "string")))
    throw new UsageError("size_configuration");
  try {
    return parseSizes(value as readonly string[] | undefined);
  } catch {
    throw new UsageError("size_configuration");
  }
}
export interface CliEnvelope {
  readonly formatVersion: "cli-v2";
  readonly kind: "result" | "error";
  readonly mode: Mode | null;
  readonly origin: Mode | null;
  readonly constructed: boolean;
  readonly status: Status;
  readonly reason: string | null;
  readonly asOf: number;
  readonly units: { readonly usdc: "10^-6 USDC"; readonly weth: "10^-18 WETH" };
  readonly sizes: readonly bigint[] | null;
  readonly observation: Observation | null;
  readonly analysis: Analysis | null;
  readonly eligibility: ReturnType<typeof analysisEligibility> | null;
  readonly persistence: SaveReceipt & {
    readonly collectionRevisionId: string | null;
    readonly lastSavedAnalysisRevisionId: string | null;
    readonly knownInvalidation: Witness | null;
  };
}
export interface CliDependencies {
  readonly onLogicalRead?: () => void;
  readonly onPhase?: (phase: "collection" | "quotes" | "revalidation") => void;
  readonly root: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly readFile?: (path: string) => string | undefined;
  readonly signal?: AbortSignal;
  readonly fetch?: Fetch;
  readonly clock?: Clock;
  readonly fixtureFactory?: () => Promise<{ fetch: Fetch }> | { fetch: Fetch };
  readonly openStore?: (path: string) => EvidenceStore;
  readonly persistentStore?: EvidenceStore;
  readonly producerGuard?: ProducerGuard;
}
function outcome(
  analysis: Analysis | null,
  state: ReturnType<typeof analysisEligibility> | null,
): Status {
  if (!analysis || !state) return "unavailable";
  if (state.canonical === "invalidated") return "invalidated";
  if (state.freshness === "stale" || state.validationExpired) return "stale";
  if (state.canonical !== "valid" || state.freshness === "unavailable") return "unavailable";
  if (
    analysis.rows.some((r) => r.status === "rejected") ||
    analysis.contracts?.identity === "rejected"
  )
    return "rejected";
  if (!state.quotesComplete) return "incomplete";
  if (!state.best || !state.qualified) return "unavailable";
  if (analysis.observation.origin === "live" && !state.workloadAdmitted) return "unavailable";
  return "usable";
}
export function formatAmount(value: bigint, decimals: number): string {
  const sign = value < 0n ? "-" : "",
    v = value < 0n ? -value : value,
    scale = 10n ** BigInt(decimals);
  const fraction = (v % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${v / scale}${fraction ? `.${fraction}` : ""}`;
}
function date(value: number): string {
  return Number.isSafeInteger(value) && Math.abs(value) <= 8_640_000_000_000_000
    ? new Date(value).toISOString()
    : "unavailable";
}
export function renderCli(e: CliEnvelope, format: Format): string {
  if (format === "json") return jsonEvidence(e);
  const observation = e.analysis?.observation ?? e.observation,
    state = e.eligibility,
    block = observation?.block;
  const lines = [
    "Pooltrace CLI (cli-v2)",
    `Mode/origin: ${e.mode ?? "unavailable"} / ${e.origin ?? "unavailable"}`,
    `Status: ${e.status}${e.reason ? ` (${e.reason})` : ""}`,
    `As of: ${date(e.asOf)}`,
    `Persistence: ${e.persistence.status}${e.persistence.reason ? ` (${e.persistence.reason})` : ""}`,
    `Saved collection: ${e.persistence.collectionRevisionId ?? "unavailable"}; last saved analysis: ${e.persistence.lastSavedAnalysisRevisionId ?? "unavailable"}`,
  ];
  if (e.constructed)
    lines.push(
      "CONSTRUCTED FIXTURE: addresses, state, and timestamps are synthetic. No live RPC was used.",
    );
  if (e.status === "configuration_error")
    lines.push(
      e.reason === "size_configuration"
        ? "Sizes must be six increasing positive USDC decimal strings in a JSON array."
        : e.reason === "configuration"
          ? "Check ETHEREUM_RPC_URL and the nonsecret provider/configuration labels in private environment settings."
          : e.reason === "environment"
            ? "Unable to read local environment configuration."
            : "Select --mode live|fixture. Run bun run cli --help for usage.",
    );
  if (!observation)
    return [...lines, "Transaction costs: unavailable", "Estimated net profit: unavailable"].join(
      "\n",
    );
  lines.push(
    `Observation: ${observation.attemptId}`,
    `Chain: ${observation.chainId ?? "unavailable"}`,
    `Block: ${block?.number ?? "unavailable"}`,
    `Hash: ${block?.hash ?? "unavailable"}`,
    `Block time: ${block ? date(Number(block.timestamp * 1000n)) : "unavailable"}`,
    `Observed: ${date(observation.finishedAt)}`,
    `Last validation: ${observation.validations.at(-1) ? date(observation.validations.at(-1)?.at ?? NaN) : "unavailable"}`,
    `Canonicality: ${state?.canonical ?? observation.validations.at(-1)?.canonical ?? "unavailable"}`,
    `Freshness: ${state?.freshness ?? "unavailable"}; age ms: ${state?.blockAgeMs ?? "unavailable"}; head lag: ${state?.headLag ?? "unavailable"}`,
    `Coverage: ${e.analysis?.rows.length ?? 0}/36; complete quotes: ${state?.quotesComplete ?? false}; qualified: ${state?.qualified ?? false}`,
    `Current live admission: ${state?.workloadAdmitted ?? false}`,
    "Transaction costs: unavailable (full_transaction_evidence_missing)",
    "Estimated net profit: unavailable (full_transaction_evidence_missing)",
  );
  if (state?.best) {
    const b = state.best;
    lines.push(
      `Best tested gross: ${formatAmount(b.gross, 6)} USDC; input ${formatAmount(b.input, 6)} USDC; route ${venue(b.route[0])} -> ${venue(b.route[1])}`,
    );
    lines.push(
      b.gross > 0n
        ? "Positive gross quotation only; estimated net profit remains unavailable."
        : "No positive gross result in the tested grid.",
    );
  } else lines.push("Best tested gross: unavailable (comparison is not fully usable).");
  if (e.analysis) {
    lines.push(
      "",
      "Route/size evidence at the recorded block (current eligibility above).",
      "Route | Input USDC | WETH after leg 1 | Final USDC | Gross USDC | At-block status/reason",
    );
    const quotes = new Map(e.analysis.quotes.map((q) => [q.quoteId, q]));
    for (const r of e.analysis.rows) {
      const intermediate = r.leg1 ? quotes.get(r.leg1)?.output : null;
      lines.push(
        `${venue(r.route[0])} -> ${venue(r.route[1])} | ${formatAmount(r.input, 6)} | ${intermediate == null ? "unavailable" : formatAmount(intermediate, 18)} | ${r.output === null ? "unavailable" : formatAmount(r.output, 6)} | ${r.gross === null ? "unavailable" : formatAmount(r.gross, 6)} | ${r.status}${r.reason ? `: ${r.reason}` : ""}`,
      );
    }
    lines.push(
      "Amounts on rejected/unavailable rows are diagnostic; they are not eligible results.",
    );
  }
  return lines.join("\n");
}
function venue(index: number): string {
  return ["V2", "V3-500", "V3-3000"][index] ?? "unavailable";
}
export async function runCli(
  args: readonly string[],
  deps: CliDependencies,
): Promise<{ exitCode: 0 | 1 | 2 | 130; stdout: string; envelope: CliEnvelope | null }> {
  let format: Format = args.some(
    (v, i) => v === "--format=json" || (v === "--format" && args[i + 1] === "json"),
  )
    ? "json"
    : "text";
  let mode: Mode | null = null,
    observation: Observation | null = null,
    analysis: Analysis | null = null,
    sizes: readonly bigint[] | null = null;
  let started = false;
  let store: EvidenceStore | undefined;
  let guard: ProducerGuard | undefined;
  let collectionRevisionId: string | null = null,
    lastSavedAnalysisRevisionId: string | null = null,
    knownInvalidation: Witness | null = null;
  let persistence: SaveReceipt = {
    status: "not_saved",
    reason: null,
    observationRevisionId: null,
    analysisRevisionId: null,
    acknowledgedAt: null,
  };
  const clock = deps.clock ?? systemClock;
  const envelope = (
    status: Status,
    reason: string | null,
    state: ReturnType<typeof analysisEligibility> | null,
  ): CliEnvelope => ({
    formatVersion: "cli-v2",
    kind: status === "configuration_error" ? "error" : "result",
    mode,
    origin: mode,
    constructed: mode === "fixture",
    status,
    reason,
    asOf: clock.wall(),
    units: { usdc: "10^-6 USDC", weth: "10^-18 WETH" },
    sizes,
    observation,
    analysis,
    eligibility: state,
    persistence: {
      ...persistence,
      collectionRevisionId,
      lastSavedAnalysisRevisionId,
      knownInvalidation,
    },
  });
  try {
    const parsed = parseCli(args);
    format = parsed.format;
    mode = parsed.mode;
    if (parsed.help)
      return {
        exitCode: 0,
        stdout:
          format === "json"
            ? jsonEvidence({ formatVersion: "cli-v2", kind: "help", help: HELP })
            : HELP,
        envelope: null,
      };
    const env = loadCliEnvironment(deps.root, deps.env, deps.readFile);
    sizes = configuredSizes(parsed.sizesRaw ?? env.USDC_INPUT_AMOUNTS);
    const textSizes = sizes.map((v) => formatAmount(v, 6));
    const config =
      mode === "fixture"
        ? readConfig({
            ETHEREUM_RPC_URL: "https://fixture.invalid",
            RPC_PROVIDER_LABEL: "constructed-fixture",
            RPC_CONFIG_REVISION: "diagnostic-fixture-v1",
          })
        : readConfig(env);
    let path: string;
    try {
      path = databasePath(deps.root, parsed.mode, env.POOLTRACE_DB_PATH);
    } catch {
      throw new UsageError("configuration");
    }
    started = true;
    guard = deps.producerGuard ?? acquireProducer(path);
    guard.assertOwned();
    store =
      deps.persistentStore ??
      (deps.openStore ? deps.openStore(guard.dbPath) : new EvidenceStore(guard.dbPath));
    let fetcher = deps.fetch;
    if (mode === "fixture")
      fetcher = (
        await (deps.fixtureFactory
          ? deps.fixtureFactory()
          : import("@pooltrace/protocols/fixtures").then((m) =>
              m.quoteFixture({ timestamp: 1_700_000_000n }),
            ))
      ).fetch;
    const options = {
      clock,
      ...(deps.onLogicalRead ? { onLogicalRead: deps.onLogicalRead } : {}),
      ...(fetcher ? { fetch: fetcher } : {}),
      ...(deps.signal ? { signal: deps.signal } : {}),
    };
    deps.onPhase?.("collection");
    observation = await collectSnapshot(config, { ...options, origin: mode ?? "live" });
    persistence = store.saveObservation(observation);
    await yieldToLoop();
    collectionRevisionId =
      persistence.status === "saved" ? persistence.observationRevisionId : null;
    if (collectionRevisionId && store.available && observation.registry && !deps.signal?.aborted) {
      deps.onPhase?.("quotes");
      analysis = await analyzeSnapshot(observation, config, { ...options, sizes: textSizes });
      persistence = store.saveAnalysis(analysis, collectionRevisionId);
      if (persistence.status === "saved")
        lastSavedAnalysisRevisionId = persistence.analysisRevisionId;
    }
    await yieldToLoop();
    if (
      analysis?.contracts &&
      store.available &&
      persistence.status === "saved" &&
      !deps.signal?.aborted
    ) {
      const previous = analysis;
      deps.onPhase?.("revalidation");
      analysis = (await prepareAnalysisForUse(analysis, config, options)).analysis;
      if (analysis !== previous && collectionRevisionId && persistence.analysisRevisionId)
        persistence = store.saveAnalysis(
          analysis,
          collectionRevisionId,
          persistence.analysisRevisionId,
        );
      if (persistence.status === "saved")
        lastSavedAnalysisRevisionId = persistence.analysisRevisionId;
    }
    // Deliver OS signals queued while synchronous SQLite was running before deciding eligibility.
    await yieldToLoop();
    knownInvalidation = store.available ? store.knownInvalidation(observation.attemptId) : null;
    await yieldToLoop();
    let state = analysis ? analysisEligibility(analysis, clock) : null;
    if (!store.available && persistence.status === "saved") state = null;
    if (state && knownInvalidation)
      state = {
        ...state,
        canonical: "invalidated",
        eligibleForLiveQualification: false,
        workloadAdmitted: false,
        best: null,
      };
    const status = deps.signal?.aborted ? "cancelled" : outcome(analysis, state);
    const reason = deps.signal?.aborted
      ? "cancelled"
      : (persistence.reason ?? analysis?.failures[0] ?? observation.failures[0] ?? null);
    const result = envelope(status, reason, state);
    return {
      exitCode:
        status === "cancelled"
          ? 130
          : status === "usable" && persistence.status === "saved"
            ? 0
            : 1,
      stdout: renderCli(result, format),
      envelope: result,
    };
  } catch (error) {
    await yieldToLoop();
    if (error instanceof StorageError)
      persistence = {
        ...persistence,
        reason: storageReason(error),
      };
    const reason =
      error instanceof ProducerOwnershipError
        ? error.reason
        : error instanceof StorageError
          ? storageReason(error)
          : error instanceof UsageError
            ? error.reason
            : error instanceof DomainError
              ? "size_configuration"
              : safeReason(error);
    const status = deps.signal?.aborted
      ? "cancelled"
      : started
        ? "unavailable"
        : "configuration_error";
    const failedState = analysis ? analysisEligibility(analysis, clock) : null;
    const result = envelope(
      status,
      deps.signal?.aborted ? "cancelled" : reason,
      failedState
        ? {
            ...failedState,
            best: null,
            workloadAdmitted: false,
            eligibleForLiveQualification: false,
          }
        : null,
    );
    return {
      exitCode: status === "cancelled" ? 130 : started ? 1 : 2,
      stdout: renderCli(result, format),
      envelope: result,
    };
  } finally {
    try {
      if (!deps.persistentStore) store?.close();
      if (!deps.producerGuard) guard?.release();
    } catch {
      /* Commit acknowledgement remains separate from handle cleanup. */
    }
  }
}
