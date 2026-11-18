export const QUOTE_POLICY = Object.freeze({
  revision: "quotation-v1",
  impactBps: 100n,
  callGas: 5_000_000n,
  maxReads: 100,
  maxSends: 200,
  finalReads: 3,
});
export const DEFAULT_SIZES = Object.freeze(["10", "50", "100", "500", "1000", "5000"]);
export const U112 = (1n << 112n) - 1n;
export const U256 = (1n << 256n) - 1n;
export const I255 = (1n << 255n) - 1n;
export const MIN_SQRT = 4295128739n;
export const MAX_SQRT = 1461446703485210103287273052203988822378723970342n;
export const Q192 = 1n << 192n;
export class DomainError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}
export function requireValue(ok: boolean, reason: string): asserts ok {
  if (!ok) throw new DomainError(reason);
}
export function uint(value: unknown, bits = 256): bigint {
  requireValue(typeof value === "bigint" && value >= 0n && value < 1n << BigInt(bits), "range");
  return value;
}
export function parseSizes(values: readonly string[] = DEFAULT_SIZES): readonly bigint[] {
  requireValue(Array.isArray(values) && values.length === 6, "size_configuration");
  const sizes = values.map((value) => {
    requireValue(
      typeof value === "string" &&
        value.length <= 85 &&
        /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value),
      "size_configuration",
    );
    const [whole = "", fraction = ""] = value.split(".");
    const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
    requireValue(amount > 0n && amount <= I255, "size_configuration");
    return amount;
  });
  requireValue(
    sizes.every((v, i) => i === 0 || v > (sizes[i - 1] ?? v)),
    "size_configuration",
  );
  return Object.freeze(sizes);
}
export function v2Output(input: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  uint(input);
  uint(reserveIn, 112);
  uint(reserveOut, 112);
  requireValue(input > 0n && reserveIn > 0n && reserveOut > 0n, "nonpositive");
  requireValue(input + reserveIn <= U112, "reserve_headroom");
  const afterFee = uint(input * 997n);
  const numerator = uint(afterFee * reserveOut);
  const denominator = uint(reserveIn * 1000n + afterFee);
  const output = numerator / denominator;
  requireValue(output < reserveOut, "output_range");
  return output;
}
export interface Ratio {
  readonly n: bigint;
  readonly d: bigint;
}
export function ratio(n: bigint, d: bigint): Ratio {
  requireValue(n > 0n && d > 0n, "invalid_ratio");
  return { n, d };
}
export function v3Ratio(sqrt: bigint, zeroForOne: boolean): Ratio {
  requireValue(sqrt >= MIN_SQRT && sqrt < MAX_SQRT, "sqrt_range");
  return zeroForOne ? ratio(sqrt * sqrt, Q192) : ratio(Q192, sqrt * sqrt);
}
export function ceil(n: bigint, d: bigint): bigint {
  requireValue(n >= 0n && d > 0n, "invalid_ratio");
  return (n + d - 1n) / d;
}
export interface Impact {
  readonly reference: Ratio;
  readonly idealNumerator: bigint;
  readonly idealDenominator: bigint;
  readonly shortfall: bigint;
  readonly bps: bigint;
  readonly passed: boolean;
}
export function impact(input: bigint, output: bigint, reference: Ratio, fee: number): Impact {
  requireValue(input > 0n && output >= 0n && [500, 3000].includes(fee), "impact_input");
  ratio(reference.n, reference.d);
  const x = input * reference.n * (1_000_000n - BigInt(fee));
  const d = reference.d * 1_000_000n;
  const shortfall = x > output * d ? x - output * d : 0n;
  return {
    reference,
    idealNumerator: x,
    idealDenominator: d,
    shortfall,
    bps: ceil(10_000n * shortfall, x),
    passed: output > 0n && 10_000n * shortfall <= QUOTE_POLICY.impactBps * x,
  };
}
export function priceLimit(sqrt: bigint, zeroForOne: boolean): bigint {
  v3Ratio(sqrt, zeroForOne);
  const limit = zeroForOne ? MIN_SQRT + 1n : MAX_SQRT - 1n;
  requireValue(zeroForOne ? limit < sqrt : limit > sqrt, "starting_limit");
  return limit;
}
export function fullInput(
  before: bigint,
  after: bigint,
  limit: bigint,
  zeroForOne: boolean,
): boolean {
  requireValue(limit === priceLimit(before, zeroForOne), "inconsistent_limit");
  uint(after, 160);
  requireValue(
    zeroForOne ? after <= before && after >= limit : after >= before && after <= limit,
    "inconsistent_price",
  );
  return after !== limit;
}
export function routes(): readonly (readonly [number, number])[] {
  return [0, 1, 2].flatMap((a) =>
    [0, 1, 2].filter((b) => a !== b).map((b): readonly [number, number] => [a, b]),
  );
}
export interface Ranked {
  readonly input: bigint;
  readonly gross: bigint;
  readonly route: readonly [number, number];
}
export function bestGross<T extends Ranked>(entries: readonly T[], admitted: boolean): T | null {
  if (!admitted || entries.length !== 36) return null;
  return (
    [...entries].sort((a, b) =>
      a.gross !== b.gross
        ? a.gross > b.gross
          ? -1
          : 1
        : a.input !== b.input
          ? a.input < b.input
            ? -1
            : 1
          : a.route[0] - b.route[0] || a.route[1] - b.route[1],
    )[0] ?? null
  );
}
// Conditional accounting only. No live producer accepts this fixture/model bundle in M1-05.
export interface CostContext {
  readonly origin: "live" | "historical" | "fixture";
  readonly chainId: bigint;
  readonly blockHash: string;
  readonly routeId: string;
  readonly input: bigint;
  readonly configurationRevision: string;
  readonly liveState?: {
    readonly blockTimestampMs: number;
    readonly validationAt: number;
    readonly headLag: bigint;
    readonly canonical: "valid" | "invalidated" | "unavailable";
    readonly clockValid: boolean;
  };
}
export interface Valuation extends Ratio {
  readonly pool: string;
  readonly blockHash: string;
}
export interface CostEvidence extends CostContext {
  readonly source: "fixture" | "estimate" | "fork_receipt";
  readonly executorRevision: string;
  readonly calldataRevision: string;
  readonly executionProfile: string;
  readonly producerRevision: string;
  readonly fullTransaction: true;
  readonly observedAt: number;
  readonly feeObservedAt: number;
  readonly validUntil: number;
  readonly gasUnits: bigint;
  readonly effectiveWeiPerGas: bigint;
  readonly otherChargesWei: bigint;
  readonly chargesComplete: true;
}
export function conditionalNet(
  context: CostContext,
  finalOutput: bigint,
  evidence: CostEvidence | null,
  valuations: readonly Valuation[],
  now: number,
):
  | {
      readonly status: "available";
      readonly wei: bigint;
      readonly cost: bigint;
      readonly net: bigint;
      readonly valuation: Valuation;
    }
  | { readonly status: "unavailable" } {
  if (!evidence || !Number.isFinite(now) || valuations.length !== 3)
    return { status: "unavailable" };
  if (
    (["origin", "chainId", "blockHash", "routeId", "input", "configurationRevision"] as const).some(
      (key) => evidence[key as keyof CostContext] !== context[key as keyof CostContext],
    ) ||
    !evidence.fullTransaction ||
    !evidence.chargesComplete ||
    !evidence.executorRevision ||
    !evidence.calldataRevision ||
    !evidence.executionProfile ||
    !evidence.producerRevision ||
    typeof evidence.gasUnits !== "bigint" ||
    typeof evidence.effectiveWeiPerGas !== "bigint" ||
    typeof evidence.otherChargesWei !== "bigint" ||
    typeof context.input !== "bigint" ||
    context.input <= 0n ||
    typeof finalOutput !== "bigint" ||
    finalOutput < 0n ||
    context.chainId !== 1n ||
    evidence.gasUnits <= 0n ||
    evidence.effectiveWeiPerGas < 0n ||
    evidence.otherChargesWei < 0n ||
    !Number.isFinite(evidence.validUntil) ||
    evidence.validUntil < now ||
    (context.origin === "live" && evidence.source !== "estimate") ||
    (context.origin === "fixture" && evidence.source !== "fixture") ||
    (context.origin !== "fixture" && evidence.source === "fixture")
  )
    return { status: "unavailable" };
  const live = context.liveState;
  if (
    context.origin === "live" &&
    (live?.canonical !== "valid" ||
      !live.clockValid ||
      !Number.isFinite(live.blockTimestampMs) ||
      now - live.blockTimestampMs > 30_000 ||
      live.blockTimestampMs - now > 2_000 ||
      !Number.isFinite(live.validationAt) ||
      now - live.validationAt > 5_000 ||
      live.validationAt > now ||
      typeof live.headLag !== "bigint" ||
      live.headLag < 0n ||
      live.headLag > 2n)
  )
    return { status: "unavailable" };
  if (
    [evidence.observedAt, evidence.feeObservedAt].some(
      (t) => !Number.isFinite(t) || now - t > 30_000 || t - now > 2_000,
    ) ||
    new Set(valuations.map((v) => v.pool.toLowerCase())).size !== 3 ||
    valuations.some(
      (v) =>
        v.blockHash !== context.blockHash ||
        typeof v.n !== "bigint" ||
        typeof v.d !== "bigint" ||
        v.n <= 0n ||
        v.d <= 0n,
    )
  )
    return { status: "unavailable" };
  const valuation = valuations.reduce((a, b) => (a.n * b.d >= b.n * a.d ? a : b));
  const wei = evidence.gasUnits * evidence.effectiveWeiPerGas + evidence.otherChargesWei;
  const cost = ceil(wei * valuation.n, valuation.d);
  return { status: "available", wei, cost, net: finalOutput - context.input - cost, valuation };
}
