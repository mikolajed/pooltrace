import { describe, expect, it } from "vitest";
import {
  parseSizes,
  v2Output,
  v3Ratio,
  priceLimit,
  fullInput,
  impact,
  bestGross,
  type Ranked,
} from "../src/index.ts";

// M1-07 R01/R02/R04/R05. Expectations do not call the calculator to generate themselves.
// V2 literals were derived with Python Fraction from the pinned UniswapV2Library expression:
// ed24991304291297c3b4a52818d02f46a17aa9a2/contracts/libraries/UniswapV2Library.sol.
const max112 = (1n << 112n) - 1n;
const maxInput = (1n << 255n) - 1n;
const minSqrt = 4295128739n;
const maxSqrt = 1461446703485210103287273052203988822378723970342n;
const q96 = 1n << 96n;
const tokenString = (raw: bigint) =>
  `${raw / 1_000_000n}.${(raw % 1_000_000n).toString().padStart(6, "0")}`;

describe("M1-07 independent arithmetic and range regressions", () => {
  it("R01 accepts exact micro-USDC and the signed input ceiling, rejects the adjacent value", () => {
    const grid = [
      "0.000001",
      "0.000002",
      "0.1",
      "1.000001",
      "9007199254.740993",
      tokenString(maxInput),
    ];
    expect(parseSizes(grid)).toEqual([
      1n,
      2n,
      100_000n,
      1_000_001n,
      9_007_199_254_740_993n,
      maxInput,
    ]);
    expect(() => parseSizes([...grid.slice(0, 5), tokenString(maxInput + 1n)])).toThrow(
      "size_configuration",
    );
    for (const invalid of [
      " 1",
      "1 ",
      "1\n",
      "1e0",
      ".1",
      "1.",
      "-1",
      "1,000",
      "00.1",
      "0.000000",
      "0.0000001",
    ])
      expect(() => parseSizes([invalid, "2", "3", "4", "5", "6"]), invalid).toThrow(
        "size_configuration",
      );
    expect(() => parseSizes(["0.1", "0.100000", "2", "3", "4", "5"])).toThrow("size_configuration");
  });

  it("R01/R02 enforces exact V2 headroom and unsigned input/reserve boundaries", () => {
    expect(v2Output(max112 - 1n, 1n, max112)).toBe(max112 - 2n);
    expect(() => v2Output(max112, 1n, max112)).toThrow("reserve_headroom");
    for (const [a, ri, ro] of [
      [0n, 1n, 1n],
      [1n, 0n, 1n],
      [1n, 1n, 0n],
    ] as const)
      expect(() => v2Output(a, ri, ro)).toThrow("nonpositive");
    for (const [a, ri, ro] of [
      [-1n, 1n, 1n],
      [1n, -1n, 1n],
      [1n, 1n, -1n],
      [1n << 256n, 1n, 1n],
      [1n, max112 + 1n, 1n],
      [1n, 1n, max112 + 1n],
    ] as const)
      expect(() => v2Output(a, ri, ro)).toThrow("range");
  });

  it.each([
    { input: 10_000_000n, ri: 2_000_000_000_000n, ro: 10n ** 21n, output: 4_984_975_149_898_877n },
    { input: 10n ** 18n, ri: 10n ** 21n, ro: 2_000_000_000_000n, output: 1_992_013_962n },
    {
      input: 9_007_199_254_740_993n,
      ri: 10n ** 25n,
      ro: 10n ** 30n,
      output: 898_017_764_891_241_095_315n,
    },
    { input: 9_007_199_254_740_993n, ri: 10n ** 30n, ro: 10n ** 25n, output: 89_801_776_569n },
  ])(
    "R02 matches independent unequal-reserve vector $input/$ri/$ro",
    ({ input, ri, ro, output }) => {
      expect(v2Output(input, ri, ro)).toBe(output);
    },
  );

  it("R02 brackets the exact V2 fraction and preserves monotonicity over a fixed boundary corpus", () => {
    // Fixed Cartesian corpus, no random seed or runtime-dependent inputs. No reference quotient.
    for (const ri of [1n, 3n, 1000n, 10n ** 18n, 10n ** 25n, max112 - 1024n]) {
      for (const ro of [1n, 7n, 1_000_000n, 10n ** 24n, max112]) {
        const inputs = [...new Set([1n, 2n, 17n, 100n, 1000n, 9_007_199_254_740_993n, max112 - ri])]
          .filter((a) => a + ri <= max112)
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        let previous = 0n;
        for (const a of inputs) {
          const q = v2Output(a, ri, ro),
            n = a * 997n * ro,
            d = ri * 1000n + a * 997n;
          expect(q * d <= n && n < (q + 1n) * d, `${a}/${ri}/${ro}`).toBe(true);
          expect(q >= previous && q < ro).toBe(true);
          previous = q;
        }
      }
    }
  });

  it("R04 preserves nonintegral reciprocal prices and the pinned TickMath endpoints", () => {
    for (const sqrt of [minSqrt, minSqrt + 1n, q96 + 1n, (q96 * 3n) / 2n, maxSqrt - 1n]) {
      const forward = v3Ratio(sqrt, true),
        reverse = v3Ratio(sqrt, false);
      expect(forward).toEqual({ n: sqrt * sqrt, d: 1n << 192n });
      expect(reverse).toEqual({ n: 1n << 192n, d: sqrt * sqrt });
      expect(forward.n * reverse.n).toBe(forward.d * reverse.d);
    }
    for (const sqrt of [minSqrt - 1n, maxSqrt])
      for (const direction of [true, false])
        expect(() => v3Ratio(sqrt, direction)).toThrow("sqrt_range");
    expect(v3Ratio((q96 * 3n) / 2n, true).n * 4n).toBe(9n * (1n << 192n));
  });

  it.each([
    { fee: 500, n: 10n, d: 3n, below: 3298n, at: 3299n, belowBps: 102n, atBps: 99n },
    { fee: 500, n: 3n, d: 10n, below: 296n, at: 297n, belowBps: 129n, atBps: 96n },
    { fee: 3000, n: 10n, d: 3n, below: 3290n, at: 3291n, belowBps: 101n, atBps: 98n },
    { fee: 3000, n: 3n, d: 10n, below: 296n, at: 297n, belowBps: 104n, atBps: 71n },
  ])(
    "R04 compares fractional ideals without premature rounding ($fee/$n/$d)",
    ({ fee, n, d, below, at, belowBps, atBps }) => {
      // Independent Fraction-derived adjacent integers around 99% of the unrounded ideal.
      expect(impact(1000n, below, { n, d }, fee)).toMatchObject({ passed: false, bps: belowBps });
      expect(impact(1000n, at, { n, d }, fee)).toMatchObject({ passed: true, bps: atBps });
      expect(impact(1000n, 10_000n, { n, d }, fee)).toMatchObject({ passed: true, bps: 0n });
    },
  );

  it("R04 includes the exact 100 bps endpoint for both supported fee rates", () => {
    for (const [fee, output] of [
      [500, 989_505n],
      [3000, 987_030n],
    ] as const) {
      expect(impact(1_000_000n, output, { n: 1n, d: 1n }, fee)).toMatchObject({
        passed: true,
        bps: 100n,
      });
      expect(impact(1_000_000n, output - 1n, { n: 1n, d: 1n }, fee)).toMatchObject({
        passed: false,
        bps: 101n,
      });
    }
  });

  it.each([true, false])(
    "R04 rejects wrong, crossed, and invalid limits in direction %s",
    (direction) => {
      const before = q96 + 17n,
        limit = direction ? minSqrt + 1n : maxSqrt - 1n;
      expect(priceLimit(before, direction)).toBe(limit);
      expect(fullInput(before, before, limit, direction)).toBe(true);
      expect(fullInput(before, limit, limit, direction)).toBe(false);
      expect(fullInput(before, direction ? limit + 1n : limit - 1n, limit, direction)).toBe(true);
      for (const after of [
        direction ? limit - 1n : limit + 1n,
        direction ? before + 1n : before - 1n,
      ])
        expect(() => fullInput(before, after, limit, direction)).toThrow("inconsistent_price");
      expect(() => fullInput(before, before, limit + 1n, direction)).toThrow("inconsistent_limit");
      expect(() => fullInput(before, 1n << 160n, limit, direction)).toThrow("range");
    },
  );

  it("R05 ranks signed USDC gross, then size/route independently of enumeration order", () => {
    const grid: Ranked[] = (
      [
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 1],
      ] as const
    ).flatMap((route) =>
      [1n, 2n, 3n, 4n, 5n, 9_007_199_254_740_993n].map((input) => ({ route, input, gross: 0n })),
    );
    for (const gross of [-100n, 0n]) {
      const rows = grid.map((r) => ({ ...r, gross })),
        expected = { route: [0, 1], input: 1n, gross };
      expect(bestGross([...rows].reverse(), true)).toEqual(expected);
      expect(bestGross([...rows.slice(17), ...rows.slice(0, 17)], true)).toEqual(expected);
    }
    const rows = grid.map((r, i) => ({ ...r, gross: i === 35 ? 3n : i === 0 ? 2n : -1000n }));
    expect(bestGross([...rows].reverse(), true)).toEqual({
      route: [2, 1],
      input: 9_007_199_254_740_993n,
      gross: 3n,
    });
    const negative = rows.map((r) => ({ ...r, gross: -r.input }));
    expect(bestGross([...negative].reverse(), true)).toMatchObject({
      route: [0, 1],
      input: 1n,
      gross: -1n,
    });
    expect(bestGross(rows.slice(1), true)).toBeNull();
    expect(bestGross(rows, false)).toBeNull();
  });
});
