import { describe, it, expect } from "vitest";
import {
  parseSizes,
  v2Output,
  U112,
  I255,
  Q192,
  MIN_SQRT,
  MAX_SQRT,
  priceLimit,
  fullInput,
  impact,
  v3Ratio,
  bestGross,
  routes,
  conditionalNet,
  type CostEvidence,
  type CostContext,
} from "../src/index.ts";

describe("exact domain arithmetic (Q01/Q02/Q06–Q12)", () => {
  it("parses micro-USDC exactly and counts all routes/sizes", () => {
    expect(parseSizes()).toEqual([10n, 50n, 100n, 500n, 1000n, 5000n].map((x) => x * 1_000_000n));
    expect(parseSizes(["0.000001", "0.1", "1.000001", "2", "3", "4"])[2]).toBe(1_000_001n);
    expect(routes()).toEqual([
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
    ]);
  });
  it.each(
    [
      [],
      ["0", "1", "2", "3", "4", "5"],
      ["1", "1.0", "2", "3", "4", "5"],
      ["1e2", "2", "3", "4", "5", "6"],
      ["01", "2", "3", "4", "5", "6"],
      ["+1", "2", "3", "4", "5", "6"],
      ["1.0000001", "2", "3", "4", "5", "6"],
      ["1", "3", "2", "4", "5", "6"],
      [`${I255}`, "2", "3", "4", "5", "6"],
    ].map((grid) => ({ grid })),
  )("rejects invalid size grids before I/O", ({ grid }) =>
    expect(() => parseSizes(grid)).toThrow(),
  );
  it("matches independently calculated small V2 fractions and conservative flooring", () => {
    // 997000/100997 = 9 + 88027/100997; reversing unequal reserves changes the result.
    expect(v2Output(1n, 100n, 1000n)).toBe(9n);
    expect(v2Output(1n, 1000n, 100n)).toBe(0n);
    let previous = 0n;
    for (let a = 1n; a < 1000n; a++) {
      const out = v2Output(a, 10_000n, 20_000n);
      expect(out >= previous && out < 20_000n).toBe(true);
      previous = out;
    }
    expect(() => v2Output(1n, U112, 1n)).toThrow("reserve_headroom");
    expect(() => v2Output(1n, 1n << 112n, 1n)).toThrow("range");
    expect(() => v2Output(0n, 100n, 100n)).toThrow();
  });
  it("uses exact raw-unit direction ratios beyond Number precision", () => {
    const sqrt = 2n ** 96n * 3n;
    expect(v3Ratio(sqrt, true)).toEqual({ n: 9n * Q192, d: Q192 });
    expect(v3Ratio(sqrt, false)).toEqual({ n: Q192, d: 9n * Q192 });
    const r = v3Ratio(sqrt, true),
      inv = v3Ratio(sqrt, false);
    expect(r.n * inv.n).toBe(r.d * inv.d);
  });
  it.each([true, false])("requires full input strictly inside the protocol limit", (direction) => {
    const before = 2n ** 96n,
      limit = priceLimit(before, direction);
    expect(fullInput(before, before, limit, direction)).toBe(true);
    expect(fullInput(before, limit, limit, direction)).toBe(false);
    expect(fullInput(before, direction ? limit + 1n : limit - 1n, limit, direction)).toBe(true);
    expect(() =>
      fullInput(before, direction ? before + 1n : before - 1n, limit, direction),
    ).toThrow("inconsistent_price");
    expect(() => priceLimit(direction ? MIN_SQRT + 1n : MAX_SQRT - 1n, direction)).toThrow(
      "starting_limit",
    );
  });
  it("checks the inclusive impact limit without rounding ideal output first", () => {
    // Fee-adjusted ideal is exactly 997000 output base units.
    const a = 1_000_000n,
      r = { n: 1n, d: 1n };
    expect(impact(a, 987030n, r, 3000).bps).toBe(100n);
    expect(impact(a, 987030n, r, 3000).passed).toBe(true);
    expect(impact(a, 987029n, r, 3000).bps).toBe(101n);
    expect(impact(a, 987029n, r, 3000).passed).toBe(false);
    expect(impact(a, 987031n, r, 3000).passed).toBe(true);
    expect(impact(1n, 0n, r, 3000).passed).toBe(false);
  });
  it("ranks signed gross, smaller sizes, then deterministic routes; refuses partial grids", () => {
    const entries = routes().flatMap((route) =>
      parseSizes().map((input) => ({ route, input, gross: -1n })),
    );
    expect(bestGross(entries, true)).toEqual(entries[0]);
    expect(bestGross(entries, false)).toBeNull();
    expect(bestGross(entries.slice(1), true)).toBeNull();
    const last = entries.at(-1);
    if (!last) throw new Error("missing constructed row");
    expect(bestGross([...entries.slice(0, 35), { ...last, gross: 1n }], true)?.gross).toBe(1n);
  });
});

describe("conditional cost evidence, never a live cost producer (Q11/Q12)", () => {
  const context: CostContext = {
    origin: "fixture",
    chainId: 1n,
    blockHash: "fixture-block",
    routeId: "0:1",
    input: 10n,
    configurationRevision: "fixture-v1",
  };
  const evidence: CostEvidence = {
    ...context,
    source: "fixture",
    executorRevision: "fixture",
    calldataRevision: "fixture",
    executionProfile: "fixture",
    producerRevision: "fixture",
    fullTransaction: true,
    observedAt: 1000,
    feeObservedAt: 1000,
    validUntil: 2000,
    gasUnits: 1n,
    effectiveWeiPerGas: 1n,
    otherChargesWei: 0n,
    chargesComplete: true,
  };
  const valuations = [
    { pool: "a", blockHash: context.blockHash, n: 1n, d: 7n },
    { pool: "b", blockHash: context.blockHash, n: 8n, d: 7n },
    { pool: "c", blockHash: context.blockHash, n: 1n, d: 2n },
  ];
  it("selects the exact maximum price and rounds cost upward once", () => {
    expect(conditionalNet(context, 9n, evidence, valuations, 1000)).toMatchObject({
      status: "available",
      wei: 1n,
      cost: 2n,
      net: -3n,
      valuation: valuations[1],
    });
    expect(conditionalNet(context, 9n, null, valuations, 1000)).toEqual({ status: "unavailable" });
  });
  it("requires explicit valid live state for conditional projections and refuses fixture relabeling", () => {
    const live = {
      ...context,
      origin: "live" as const,
      liveState: {
        blockTimestampMs: 1000,
        validationAt: 1000,
        headLag: 2n,
        canonical: "valid" as const,
        clockValid: true,
      },
    };
    const supplied = { ...evidence, ...live, source: "estimate" as const };
    expect(conditionalNet(live, 100n, supplied, valuations, 1000).status).toBe("available");
    expect(
      conditionalNet(
        { ...live, liveState: { ...live.liveState, headLag: 3n } },
        100n,
        supplied,
        valuations,
        1000,
      ).status,
    ).toBe("unavailable");
    expect(
      conditionalNet(
        { ...live, liveState: { ...live.liveState, validationAt: -4001 } },
        100n,
        supplied,
        valuations,
        1000,
      ).status,
    ).toBe("unavailable");
    expect(
      conditionalNet(
        { ...context, origin: "historical" },
        100n,
        { ...evidence, origin: "historical" },
        valuations,
        1000,
      ).status,
    ).toBe("unavailable");
    expect(
      conditionalNet(
        context,
        100n,
        { ...evidence, gasUnits: undefined } as unknown as CostEvidence,
        valuations,
        1000,
      ).status,
    ).toBe("unavailable");
  });
  it.each([
    { blockHash: "wrong" },
    { input: 11n },
    { source: "fork_receipt" as const, origin: "live" as const },
    { validUntil: 999 },
    { observedAt: -29001 },
    { feeObservedAt: 3001 },
    { chargesComplete: false },
    { executorRevision: "" },
    { gasUnits: 0n },
    { otherChargesWei: -1n },
  ])("refuses mismatched/missing/stale cost evidence", (change) => {
    expect(
      conditionalNet(context, 100n, { ...evidence, ...change } as CostEvidence, valuations, 1000),
    ).toEqual({ status: "unavailable" });
  });
});
