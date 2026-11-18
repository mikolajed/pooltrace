import { afterEach, describe, expect, it } from "vitest";
import { decodeFunctionData, encodeFunctionResult, parseAbi, type Abi } from "viem";
import {
  REGISTRY,
  QUOTE_ABI,
  QUOTE_SOURCE,
  RpcSession,
  quoteLeg,
  verifyQuotationContracts,
  type PoolObservation,
} from "../src/index.ts";
import { BLOCK_HASH, success, quoteFixture } from "../src/fixtures.ts";

const abi: Abi = parseAbi(Object.values(QUOTE_ABI));
const sessions: RpcSession[] = [];
afterEach(() => {
  for (const rpc of sessions.splice(0)) rpc.close();
});
const ids = {
  analysisId: "constructed-analysis",
  observationId: "constructed-source",
  quoteId: "constructed-leg",
};
const sqrt = 25_000n * (1n << 96n);
function pool(protocol: "v2" | "v3", fee: number): PoolObservation {
  return {
    protocol,
    fee,
    address: "0x1111111111111111111111111111111111111111",
    blockHash: BLOCK_HASH,
    finiteSizeSuitability: "unavailable",
    values: {
      token0: REGISTRY.usdc,
      token1: REGISTRY.weth,
      reserve0: 2_000_000_000_000n,
      reserve1: 10n ** 21n,
      sqrtPriceX96: sqrt,
    },
  };
}

describe("M1-07 actual quotation wire direction and units (R03)", () => {
  it.each([
    {
      tokenIn: REGISTRY.usdc,
      tokenOut: REGISTRY.weth,
      input: 10_000_000n,
      output: 4_984_975_149_898_877n,
    },
    { tokenIn: REGISTRY.weth, tokenOut: REGISTRY.usdc, input: 10n ** 18n, output: 1_992_013_962n },
  ])(
    "maps unequal V2 reserves and exact token path for $tokenIn",
    async ({ tokenIn, tokenOut, input, output }) => {
      // Literal Fraction-derived outputs, independent of v2Output and the general fixture.
      let sends = 0;
      const rpc = new RpcSession({
        url: "https://fixture.invalid",
        fetch: async (_url, init) => {
          const r = JSON.parse(String(init.body));
          sends++;
          expect(r.method).toBe("eth_call");
          expect(r.params[1]).toEqual({ blockHash: BLOCK_HASH, requireCanonical: true });
          expect(r.params[0].to.toLowerCase()).toBe(QUOTE_SOURCE.router.toLowerCase());
          expect(r.params[0].gas).toBe("0x4c4b40");
          expect(decodeFunctionData({ abi, data: r.params[0].data })).toMatchObject({
            functionName: "getAmountsOut",
            args: [input, [tokenIn, tokenOut]],
          });
          return success(
            r,
            encodeFunctionResult({ abi, functionName: "getAmountsOut", result: [input, output] }),
          );
        },
      });
      sessions.push(rpc);
      expect(await quoteLeg(rpc, pool("v2", 3000), input, tokenIn, ids)).toMatchObject({
        tokenIn,
        tokenOut,
        input,
        output,
        status: "passed",
        fullInput: true,
      });
      expect(sends).toBe(1);
    },
  );

  it.each([
    { fee: 500, zero: true, input: 10_000_000n, output: 6_246_875_000_000_000n },
    { fee: 3000, zero: true, input: 10_000_000n, output: 6_231_250_000_000_000n },
    { fee: 500, zero: false, input: 10n ** 18n, output: 1_599_200_000n },
    { fee: 3000, zero: false, input: 10n ** 18n, output: 1_595_200_000n },
  ])(
    "preserves the V3 $fee/$zero tuple and mixed raw units",
    async ({ fee, zero, input, output }) => {
      // Constructed marginal replies at raw ratio 625000000 (1600 USDC/WETH).
      // These literals test adapter direction/units, not independent V3 swap execution.
      const tokenIn = zero ? REGISTRY.usdc : REGISTRY.weth,
        tokenOut = zero ? REGISTRY.weth : REGISTRY.usdc;
      const limit = zero ? 4295128740n : 1461446703485210103287273052203988822378723970341n;
      const after = sqrt + (zero ? -1n : 1n);
      const rpc = new RpcSession({
        url: "https://fixture.invalid",
        fetch: async (_url, init) => {
          const r = JSON.parse(String(init.body));
          expect(r.params[1]).toEqual({ blockHash: BLOCK_HASH, requireCanonical: true });
          expect(r.params[0].to.toLowerCase()).toBe(QUOTE_SOURCE.quoter.toLowerCase());
          expect(r.params[0].gas).toBe("0x4c4b40");
          expect(decodeFunctionData({ abi, data: r.params[0].data })).toMatchObject({
            functionName: "quoteExactInputSingle",
            args: [{ tokenIn, tokenOut, amountIn: input, fee, sqrtPriceLimitX96: limit }],
          });
          return success(
            r,
            encodeFunctionResult({
              abi,
              functionName: "quoteExactInputSingle",
              result: [output, after, 7, 123456n],
            }),
          );
        },
      });
      sessions.push(rpc);
      const result = await quoteLeg(rpc, pool("v3", fee), input, tokenIn, ids);
      expect(result).toMatchObject({
        tokenIn,
        tokenOut,
        input,
        output,
        status: "passed",
        fullInput: true,
        evidence: {
          sqrtBefore: sqrt,
          sqrtAfter: after,
          limit,
          initializedTicksCrossed: 7,
          gasEstimate: 123456n,
        },
      });
      const reference = result.impact?.reference;
      if (!reference) throw new Error("missing price reference");
      expect(
        zero
          ? reference.n === 625_000_000n * reference.d
          : reference.d === 625_000_000n * reference.n,
      ).toBe(true);
      expect(rpc.requests).toHaveLength(1);
    },
  );

  it.each(["WETH", "WETH9"])("rejects the quotation contract's wrong %s identity", async (name) => {
    const f = quoteFixture({
      intercept: (r) => {
        if (r.method !== "eth_call") return undefined;
        const decoded = decodeFunctionData({
          abi: parseAbi([...Object.values(QUOTE_ABI), "function factory() view returns (address)"]),
          data: (r.params[0] as { data: `0x${string}` }).data,
        });
        return decoded.functionName === name
          ? success(r, encodeFunctionResult({ abi, functionName: name, result: REGISTRY.usdc }))
          : undefined;
      },
    });
    const rpc = new RpcSession({ url: "https://fixture.invalid", fetch: f.fetch });
    sessions.push(rpc);
    const result = await verifyQuotationContracts(rpc, BLOCK_HASH);
    expect(result.identity).toBe("rejected");
    expect(result.checks.filter((c) => c.status === "rejected")).toHaveLength(1);
  });
});
