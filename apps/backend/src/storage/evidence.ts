import { POLICY, REGISTRY, QUOTE_SOURCE } from "@pooltrace/protocols";
import { QUOTE_POLICY } from "@pooltrace/domain";
import type { Observation } from "../snapshot.ts";
import type { Analysis } from "../analysis.ts";
import { digest } from "./codec.ts";
import { StorageError } from "./driver.ts";

type Check = (v: unknown) => boolean;
const big: Check = (v) => typeof v === "bigint";
const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
const bool: Check = (v) => typeof v === "boolean";
const safe: Check = (v) => typeof v === "string" && /^[a-zA-Z0-9_:.-]{1,256}$/.test(v);
const hex: Check = (v) => typeof v === "string" && /^0x[0-9a-fA-F]+$/.test(v);
const hash: Check = (v) => hex(v) && (v as string).length === 66;
const address: Check = (v) => hex(v) && (v as string).length === 42;
const literal =
  (...values: readonly unknown[]): Check =>
  (v) =>
    values.includes(v);
const nullable =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const array =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check);
const object =
  (fields: Record<string, Check>, optional: readonly string[] = []): Check =>
  (v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const data = v as Record<string, unknown>;
    return (
      Object.keys(data).every((k) => Object.hasOwn(fields, k)) &&
      Object.entries(fields).every(
        ([k, check]) =>
          (optional.includes(k) && data[k] === undefined) ||
          (Object.hasOwn(data, k) && check(data[k])),
      )
    );
  };
const dictionary =
  (key: Check, value: Check): Check =>
  (v) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.entries(v).every(([k, x]) => key(k) && value(x));
const exact =
  (expected: unknown): Check =>
  (v) =>
    digest(v) === digest(expected);
const screen = literal("passed", "rejected", "unavailable");
const primitive: Check = (v) => big(v) || num(v) || bool(v) || hex(v);
const check = object({ name: safe, status: screen, reason: safe, observed: primitive }, [
  "reason",
  "observed",
]);
const request = object({
  method: literal(
    "eth_chainId",
    "eth_getBlockByNumber",
    "eth_getBlockByHash",
    "eth_getCode",
    "eth_call",
  ),
  send: num,
  outcome: safe,
});
const header = object({ number: big, timestamp: big, hash, parentHash: hash });
const validation = object(
  {
    at: num,
    monotonicAt: num,
    canonical: literal("valid", "invalidated", "unavailable"),
    reason: safe,
    head: nullable(header),
  },
  ["reason"],
);
const poolFields = {
  factory: address,
  token0: address,
  token1: address,
  reserve0: big,
  reserve1: big,
  blockTimestampLast: num,
  fee: num,
  tickSpacing: num,
  sqrtPriceX96: big,
  tick: num,
  observationIndex: num,
  observationCardinality: num,
  observationCardinalityNext: num,
  feeProtocol: num,
  unlocked: bool,
  liquidity: big,
};
const registry = object({
  source: exact(REGISTRY),
  checks: array(check),
  codeHashes: dictionary(address, hash),
  tokens: array(object({ address, expectedDecimals: num, observedDecimals: nullable(num) })),
  pools: array(
    object({
      protocol: literal("v2", "v3"),
      fee: num,
      address,
      blockHash: hash,
      values: object(poolFields, Object.keys(poolFields)),
      finiteSizeSuitability: literal("unavailable"),
    }),
  ),
  identity: screen,
  structural: screen,
  finiteSizeSuitability: literal("unavailable"),
  workloadAdmitted: literal(false),
});
const observation = object({
  attemptId: safe,
  origin: literal("live", "historical", "fixture"),
  chainId: nullable(big),
  providerLabel: safe,
  configurationRevision: safe,
  implementationRevision: literal("m1-03-v1"),
  policy: exact(POLICY),
  dependencyVersions: object({ viem: literal("2.57.20") }),
  block: nullable(header),
  startedAt: num,
  finishedAt: num,
  startedMono: num,
  elapsedMs: num,
  clockInvalid: bool,
  capabilities: array(
    object({ method: safe, positive: bool, unknownHashRejected: bool, unknownHashTestInput: hash }),
  ),
  registry: nullable(registry),
  complete: bool,
  failures: array(safe),
  validations: array(validation),
  requests: array(request),
});
const impact = object({
  reference: object({ n: big, d: big }),
  idealNumerator: big,
  idealDenominator: big,
  shortfall: big,
  bps: big,
  passed: bool,
});
const quoteFields = {
  quoteId: safe,
  analysisId: safe,
  observationId: safe,
  pool: address,
  protocol: literal("v2", "v3"),
  fee: num,
  blockHash: hash,
  tokenIn: address,
  tokenOut: address,
  input: big,
  target: address,
  method: safe,
  gas: big,
  status: screen,
  reason: nullable(safe),
  output: nullable(big),
  fullInput: bool,
  impact: nullable(impact),
  evidence: object(
    {
      comparedInput: big,
      comparedOutput: big,
      sqrtBefore: big,
      limit: big,
      sqrtAfter: big,
      initializedTicksCrossed: num,
      gasEstimate: big,
    },
    [
      "comparedInput",
      "comparedOutput",
      "sqrtBefore",
      "limit",
      "sqrtAfter",
      "initializedTicksCrossed",
      "gasEstimate",
    ],
  ),
};
const unavailable = object({
  status: literal("unavailable"),
  reason: literal("full_transaction_evidence_missing"),
});
const analysis = object({
  attemptId: safe,
  observation,
  implementationRevision: literal("m1-05-v1"),
  policy: exact(QUOTE_POLICY),
  sizes: array(big),
  contracts: nullable(
    object({
      source: exact(QUOTE_SOURCE),
      checks: array(check),
      codeHashes: dictionary(address, hash),
      identity: screen,
    }),
  ),
  rows: array(
    object({
      route: (v) => Array.isArray(v) && v.length === 2 && v.every(num),
      input: big,
      leg1: nullable(safe),
      leg2: nullable(safe),
      status: screen,
      reason: nullable(safe),
      output: nullable(big),
      gross: nullable(big),
    }),
  ),
  quotes: array(object(quoteFields)),
  startedAt: num,
  finishedAt: num,
  elapsedMs: num,
  clockInvalid: bool,
  logicalReads: num,
  requests: array(request),
  failures: array(safe),
  transactionCost: unavailable,
  netProfit: unavailable,
});
export function assertObservation(value: unknown): asserts value is Observation {
  if (!observation(value)) throw new StorageError("storage_encoding");
}
export function assertAnalysis(value: unknown): asserts value is Analysis {
  if (!analysis(value)) throw new StorageError("storage_encoding");
  const a = value as Analysis,
    ids = new Set(a.quotes.map((q) => q.quoteId));
  if (
    a.rows.length !== 36 ||
    a.sizes.length !== 6 ||
    ids.size !== a.quotes.length ||
    a.quotes.some(
      (q) =>
        q.analysisId !== a.attemptId ||
        q.observationId !== a.observation.attemptId ||
        q.blockHash !== a.observation.block?.hash,
    ) ||
    a.rows.some((r) => [r.leg1, r.leg2].some((id) => id !== null && !ids.has(id)))
  )
    throw new StorageError("storage_encoding");
}
export function observationCore(o: Observation) {
  const { validations: _, requests: __, clockInvalid: ___, ...core } = o;
  return core;
}
export function analysisCore(a: Analysis) {
  const { observation: _, ...core } = a;
  return core;
}
export function assertExtension(parent: Observation, child: Observation) {
  const prefix = (a: readonly unknown[], b: readonly unknown[]) =>
    b.length >= a.length && digest(b.slice(0, a.length)) === digest(a);
  if (
    digest(observationCore(parent)) !== digest(observationCore(child)) ||
    !prefix(parent.requests, child.requests) ||
    !prefix(parent.validations, child.validations) ||
    (parent.clockInvalid && !child.clockInvalid)
  )
    throw new StorageError("storage_conflict");
}
