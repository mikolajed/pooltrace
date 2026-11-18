// Explicit read-only integration gate. Not a market CLI, service, or transaction entry point.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv, isDeepStrictEqual } from "node:util";
import {
  analyzeSnapshot,
  analysisEligibility,
  collectSnapshot,
  prepareAnalysisForUse,
  readConfig,
  type Analysis,
} from "../apps/backend/src/index.ts";
import { jsonEvidence, POLICY, safeReason } from "../packages/protocols/src/index.ts";
import { DomainError, parseSizes } from "../packages/domain/src/index.ts";

function deterministic(a: Analysis) {
  const lookup = new Map(a.quotes.map((q) => [q.quoteId, q]));
  const leg = (id: string | null) => {
    const q = id ? lookup.get(id) : null;
    if (!q) return null;
    const { gasEstimate: _, ...evidence } = q.evidence;
    return {
      pool: q.pool,
      protocol: q.protocol,
      fee: q.fee,
      blockHash: q.blockHash,
      tokenIn: q.tokenIn,
      tokenOut: q.tokenOut,
      input: q.input,
      output: q.output,
      fullInput: q.fullInput,
      status: q.status,
      reason: q.reason,
      impact: q.impact,
      evidence,
    };
  };
  return a.rows.map((r) => ({
    route: r.route,
    input: r.input,
    output: r.output,
    gross: r.gross,
    status: r.status,
    reason: r.reason,
    first: leg(r.leg1),
    second: leg(r.leg2),
  }));
}
try {
  let local: Record<string, string | undefined> = {};
  for (const name of [".env", ".env.local"])
    if (existsSync(name)) local = { ...local, ...parseEnv(readFileSync(name, "utf8")) };
  const env = { ...local, ...process.env },
    config = readConfig(env);
  let values: unknown;
  try {
    values = env.USDC_INPUT_AMOUNTS ? JSON.parse(env.USDC_INPUT_AMOUNTS) : undefined;
  } catch {
    throw new DomainError("size_configuration");
  }
  if (values !== undefined && !Array.isArray(values)) throw new DomainError("size_configuration");
  const sizes = values as readonly string[] | undefined;
  parseSizes(sizes);
  const options = sizes ? { sizes } : {};
  const observation = await collectSnapshot(config);
  const analysis = observation.registry
    ? await analyzeSnapshot(observation, config, options)
    : null;
  const state = analysis ? analysisEligibility(analysis) : null;
  // Verify live expiry/use before independent historical replay; each eligibility is as-of its event.
  await new Promise((resolve) => setTimeout(resolve, POLICY.maxValidationAgeMs + 10));
  const expired = analysis ? analysisEligibility(analysis) : null;
  const refreshed = analysis?.contracts ? await prepareAnalysisForUse(analysis, config) : null;
  const historical = observation.block
    ? await collectSnapshot(config, { blockNumber: observation.block.number })
    : null;
  const repeated = historical?.registry ? await analyzeSnapshot(historical, config, options) : null;
  const repeatedEligibility = repeated ? analysisEligibility(repeated) : null;
  const deterministicState =
    analysis !== null &&
    repeated !== null &&
    isDeepStrictEqual(deterministic(analysis), deterministic(repeated)) &&
    isDeepStrictEqual(state?.best, repeatedEligibility?.best);
  mkdirSync("data", { recursive: true });
  const report = `data/m1-05-live-${observation.attemptId}.json`;
  const expiryCheck = {
    priorValidationExpired: expired?.validationExpired ?? null,
    afterUse: refreshed?.eligibility ?? null,
  };
  writeFileSync(
    report,
    `${jsonEvidence({ observation, analysis, eligibility: state, repeated, repeatedEligibility, deterministicState, revalidated: refreshed?.analysis ?? null, expiryCheck })}\n`,
  );
  console.log(
    jsonEvidence({
      report,
      block: observation.block,
      deterministicState,
      eligible: state?.workloadAdmitted ?? false,
      qualified: state?.qualified ?? false,
      rows: analysis?.rows.length ?? 0,
      quotes: analysis?.quotes.length ?? 0,
      logicalReads: analysis?.logicalReads ?? 0,
      sends: analysis?.requests.length ?? 0,
      failures: analysis?.failures ?? observation.failures,
      rejected: analysis?.rows
        .filter((r) => r.status !== "passed")
        .map((r) => ({ route: r.route, input: r.input, status: r.status, reason: r.reason })),
      contracts: analysis?.contracts?.checks.filter((c) => c.status !== "passed"),
      best: state?.best,
      transactionCost: state?.transactionCost,
      netProfit: state?.netProfit,
      expiryCheck,
    }),
  );
  if (
    !state?.workloadAdmitted ||
    !deterministicState ||
    !repeated ||
    !analysisEligibility(repeated).qualified ||
    !expired?.validationExpired ||
    !refreshed?.eligibility.workloadAdmitted
  )
    process.exitCode = 1;
} catch (error) {
  console.error(safeReason(error));
  process.exitCode = 1;
}
