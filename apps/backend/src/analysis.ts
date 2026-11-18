import { randomUUID } from "node:crypto";
import { parseSizes, routes, bestGross, QUOTE_POLICY, type Ranked } from "@pooltrace/domain";
import {
  RpcSession,
  RpcFailure,
  POLICY,
  REGISTRY,
  QUOTE_SOURCE,
  verifyQuotationContracts,
  quoteLeg,
  safeReason,
  systemClock,
  type Clock,
  type Fetch,
  type LegQuote,
  type QuotationContracts,
  type RequestEvidence,
} from "@pooltrace/protocols";
import { readConfig, type BackendConfig } from "./config.ts";
import {
  freeze,
  validate,
  eligibility,
  revalidateSnapshot,
  type Observation,
  type Validation,
} from "./snapshot.ts";

export interface AnalysisOptions {
  readonly sizes?: readonly string[];
  readonly fetch?: Fetch;
  readonly clock?: Clock;
  readonly signal?: AbortSignal;
}
export interface CycleRow {
  readonly route: readonly [number, number];
  readonly input: bigint;
  readonly leg1: string | null;
  readonly leg2: string | null;
  readonly status: "passed" | "rejected" | "unavailable";
  readonly reason: string | null;
  readonly output: bigint | null;
  readonly gross: bigint | null;
}
export interface Analysis {
  readonly attemptId: string;
  readonly observation: Observation;
  readonly implementationRevision: "m1-05-v1";
  readonly policy: typeof QUOTE_POLICY;
  readonly sizes: readonly bigint[];
  readonly contracts: QuotationContracts | null;
  readonly rows: readonly CycleRow[];
  readonly quotes: readonly LegQuote[];
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly elapsedMs: number;
  readonly clockInvalid: boolean;
  readonly logicalReads: number;
  readonly requests: readonly RequestEvidence[];
  readonly failures: readonly string[];
  readonly transactionCost: {
    readonly status: "unavailable";
    readonly reason: "full_transaction_evidence_missing";
  };
  readonly netProfit: {
    readonly status: "unavailable";
    readonly reason: "full_transaction_evidence_missing";
  };
}
export function analysisEligibility(a: Analysis, clock: Clock = systemClock) {
  const state = eligibility(a.observation, clock);
  const coverageComplete = a.rows.length === 36;
  const quotesComplete =
    coverageComplete && a.rows.every((r) => r.output !== null && r.gross !== null);
  const qualified =
    coverageComplete &&
    a.contracts?.identity === "passed" &&
    a.rows.every((r) => r.status === "passed");
  const usable =
    qualified &&
    !a.clockInvalid &&
    state.canonical === "valid" &&
    !state.validationExpired &&
    ["fresh", "historical", "fixture"].includes(state.freshness);
  const ranked: Ranked[] = a.rows.flatMap((r) =>
    r.gross === null ? [] : [{ route: r.route, input: r.input, gross: r.gross }],
  );
  return {
    ...state,
    finiteSizeSuitability: qualified
      ? ("passed" as const)
      : a.rows.some((r) => r.status === "rejected")
        ? ("rejected" as const)
        : ("unavailable" as const),
    coverageComplete,
    quotesComplete,
    qualified,
    workloadAdmitted: usable && a.observation.origin === "live",
    best: bestGross(ranked, usable),
    rankingMetric: "absolute_usdc_gross_surplus" as const,
    transactionCost: a.transactionCost,
    netProfit: a.netProfit,
  };
}
function checkedConfig(observation: Observation, input: BackendConfig): BackendConfig {
  const config = readConfig({
    ETHEREUM_RPC_URL: input.rpcUrl,
    RPC_PROVIDER_LABEL: input.providerLabel,
    RPC_CONFIG_REVISION: input.configurationRevision,
  });
  if (
    config.providerLabel !== observation.providerLabel ||
    config.configurationRevision !== observation.configurationRevision ||
    observation.policy.revision !== POLICY.revision ||
    observation.registry?.source.revision !== REGISTRY.revision
  )
    throw new RpcFailure("configuration");
  return config;
}
export async function analyzeSnapshot(
  source: Observation,
  input: BackendConfig,
  options: AnalysisOptions = {},
): Promise<Analysis> {
  const sizes = parseSizes(options.sizes);
  const config = checkedConfig(source, input);
  const clock = options.clock ?? systemClock;
  const attemptId = randomUUID();
  const events: Validation[] = [];
  const failures: string[] = [];
  const quotes: LegQuote[] = [];
  let contracts: QuotationContracts | null = null;
  let renewal: Promise<void> | null = null;
  let rpc: RpcSession;
  function current(): Observation {
    return {
      ...source,
      clockInvalid: source.clockInvalid || rpc.clockInvalid,
      validations: [...source.validations, ...events],
    };
  }
  function invalidated(): boolean {
    return [...source.validations, ...events].some((v) => v.canonical === "invalidated");
  }
  async function gate(): Promise<void> {
    if (invalidated()) throw new RpcFailure("noncanonical");
    if (
      !source.block ||
      !source.complete ||
      source.registry?.identity !== "passed" ||
      source.registry.structural !== "passed"
    )
      throw new RpcFailure("state_unavailable");
    let state = eligibility(current(), clock);
    if (state.validationExpired || state.canonical !== "valid" || renewal) {
      if (!renewal)
        renewal = validate(rpc, source.block)
          .then((event) => {
            events.push(event);
          })
          .finally(() => {
            renewal = null;
          });
      await renewal;
      state = eligibility(current(), clock);
    }
    if (state.canonical !== "valid")
      throw new RpcFailure(
        state.canonical === "invalidated" ? "noncanonical" : "state_unavailable",
      );
    if (state.validationExpired) throw new RpcFailure("validation_expired");
    if (!["fresh", "historical", "fixture"].includes(state.freshness))
      throw new RpcFailure("stale");
  }
  rpc = new RpcSession({
    url: config.rpcUrl,
    ...options,
    maxReads: QUOTE_POLICY.maxReads,
    maxSends: QUOTE_POLICY.maxSends,
    reserveReads: QUOTE_POLICY.finalReads,
    beforeStateSend: gate,
  });
  const rows: CycleRow[] = routes().flatMap((route) =>
    sizes.map((input) => ({
      route,
      input,
      leg1: null,
      leg2: null,
      status: "unavailable",
      reason: "not_started",
      output: null,
      gross: null,
    })),
  );
  const reads = new Map<string, Promise<LegQuote>>();
  function read(poolIndex: number, amount: bigint, first: boolean): Promise<LegQuote> {
    const pool = source.registry?.pools[poolIndex];
    if (!pool) throw new RpcFailure("state_unavailable");
    const tokenIn = first ? REGISTRY.usdc : REGISTRY.weth;
    const key = [
      attemptId,
      source.attemptId,
      source.origin,
      source.chainId,
      source.block?.hash,
      source.configurationRevision,
      source.registry?.source.revision,
      QUOTE_SOURCE.revision,
      QUOTE_POLICY.revision,
      pool.address,
      pool.fee,
      tokenIn,
      amount,
      QUOTE_POLICY.callGas,
      pool.values.sqrtPriceX96,
    ].join(":");
    let value = reads.get(key);
    if (!value) {
      value = quoteLeg(rpc, pool, amount, tokenIn, {
        analysisId: attemptId,
        observationId: source.attemptId,
        quoteId: `${attemptId}:${reads.size}`,
      }).then((q) => {
        quotes.push(q);
        if (q.reason === "noncanonical" && !invalidated())
          events.push({
            at: clock.wall(),
            monotonicAt: clock.mono(),
            canonical: "invalidated",
            reason: "noncanonical",
            head: null,
          });
        return q;
      });
      reads.set(key, value);
    }
    return value;
  }
  try {
    await gate();
    if (!source.block) throw new RpcFailure("state_unavailable");
    contracts = await verifyQuotationContracts(rpc, source.block.hash);
    if (contracts.checks.some((c) => c.reason === "noncanonical"))
      events.push({
        at: clock.wall(),
        monotonicAt: clock.mono(),
        canonical: "invalidated",
        reason: "noncanonical",
        head: null,
      });
    if (contracts.identity !== "passed") throw new RpcFailure("state_unavailable");
    let next = 0;
    // Three state workers leave a semaphore slot for uncached control validation, including
    // renewal invoked by queued/retried state sends. All sends still share the four-slot reader.
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (next < rows.length) {
          const index = next++;
          const row = rows[index];
          if (!row) continue;
          try {
            const first = await read(row.route[0], row.input, true);
            if (first.status !== "passed" || first.output === null) {
              rows[index] = {
                ...row,
                leg1: first.quoteId,
                status: first.status,
                reason: `leg1:${first.reason ?? "unavailable"}`,
              };
              continue;
            }
            const second = await read(row.route[1], first.output, false);
            const output = second.fullInput ? second.output : null;
            rows[index] = {
              ...row,
              leg1: first.quoteId,
              leg2: second.quoteId,
              status: second.status,
              reason: second.reason === null ? null : `leg2:${second.reason}`,
              output,
              gross: output === null ? null : output - row.input,
            };
          } catch (error) {
            rows[index] = { ...row, reason: safeReason(error) };
          }
        }
      }),
    );
  } catch (error) {
    const reason = safeReason(error);
    failures.push(reason);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.reason === "not_started") rows[i] = { ...row, reason };
    }
  } finally {
    rpc.releaseReserve();
    if (source.block && !invalidated()) events.push(await validate(rpc, source.block));
    rpc.close();
  }
  const observation = freeze({ ...current(), requests: [...source.requests, ...rpc.requests] });
  return freeze({
    attemptId,
    observation,
    implementationRevision: "m1-05-v1",
    policy: QUOTE_POLICY,
    sizes,
    contracts,
    rows,
    quotes,
    startedAt: rpc.startedWall,
    finishedAt: clock.wall(),
    elapsedMs: clock.mono() - rpc.startedMono,
    clockInvalid: rpc.clockInvalid,
    logicalReads: rpc.logicalReads,
    requests: rpc.requests,
    failures,
    transactionCost: { status: "unavailable", reason: "full_transaction_evidence_missing" },
    netProfit: { status: "unavailable", reason: "full_transaction_evidence_missing" },
  });
}
export async function revalidateAnalysis(
  a: Analysis,
  config: BackendConfig,
  options: Omit<AnalysisOptions, "sizes"> = {},
): Promise<Analysis> {
  checkedConfig(a.observation, config);
  if (
    a.policy.revision !== QUOTE_POLICY.revision ||
    a.contracts?.source.revision !== QUOTE_SOURCE.revision
  )
    throw new RpcFailure("configuration");
  const observation = await revalidateSnapshot(a.observation, config, options);
  return observation === a.observation ? a : freeze({ ...a, observation });
}
export async function prepareAnalysisForUse(
  a: Analysis,
  config: BackendConfig,
  options: Omit<AnalysisOptions, "sizes"> = {},
) {
  const state = analysisEligibility(a, options.clock);
  const analysis =
    state.validationExpired && state.canonical !== "invalidated"
      ? await revalidateAnalysis(a, config, options)
      : a;
  return { analysis, eligibility: analysisEligibility(analysis, options.clock) };
}
