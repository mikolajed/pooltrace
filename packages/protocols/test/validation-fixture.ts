// Test-only constructed state/replies. Not market evidence, independent V2 math, or a V3 swap engine.
import { decodeFunctionData, encodeFunctionResult, parseAbi, type Abi, type Hex } from "viem";
import { v2Output } from "@pooltrace/domain";
import { ABI, REGISTRY, QUOTE_ABI, QUOTE_SOURCE } from "../src/index.ts";
import { fixture, success, type WireRequest } from "../src/fixtures.ts";

export const quoteAbi: Abi = parseAbi([...Object.values(ABI), ...Object.values(QUOTE_ABI)]);
export const sqrt = 25_000n * (1n << 96n);
export function call(request: WireRequest) {
  if (request.method !== "eth_call") return null;
  const tx = request.params[0] as { to: string; data: Hex };
  return { ...decodeFunctionData({ abi: quoteAbi, data: tx.data }), target: tx.to.toLowerCase() };
}
export function reply(request: WireRequest, functionName: string, result: unknown) {
  return success(request, encodeFunctionResult({ abi: quoteAbi, functionName, result }));
}
export function asymmetricFixture(
  intercept?: (r: WireRequest) => Response | Promise<Response> | undefined,
) {
  let elapsed = 0;
  const clock = { wall: () => 1_700_000_000_000 + elapsed, mono: () => elapsed };
  const f = fixture({
    timestamp: 1_700_000_000n,
    override: (_target, name) =>
      name === "getReserves"
        ? [2_000_000_000_000n, 10n ** 21n, 1]
        : name === "slot0"
          ? [sqrt, 0, 0, 1, 1, 0, true]
          : undefined,
    intercept: async (r) => {
      const replaced = await intercept?.(r);
      if (replaced) return replaced;
      const c = call(r);
      if (
        !c ||
        ![QUOTE_SOURCE.router.toLowerCase(), QUOTE_SOURCE.quoter.toLowerCase()].includes(c.target)
      )
        return undefined;
      if (c.functionName === "factory")
        return reply(
          r,
          c.functionName,
          c.target === QUOTE_SOURCE.router.toLowerCase() ? REGISTRY.v2Factory : REGISTRY.v3Factory,
        );
      if (c.functionName === "WETH" || c.functionName === "WETH9")
        return reply(r, c.functionName, REGISTRY.weth);
      if (c.functionName === "getAmountsOut") {
        const input = c.args?.[0] as bigint,
          path = c.args?.[1] as string[];
        const zero = path[0]?.toLowerCase() === REGISTRY.usdc.toLowerCase();
        const ri = zero ? 2_000_000_000_000n : 10n ** 21n,
          ro = zero ? 10n ** 21n : 2_000_000_000_000n;
        return reply(r, c.functionName, [input, v2Output(input, ri, ro)]);
      }
      if (c.functionName === "quoteExactInputSingle") {
        const p = c.args?.[0] as { tokenIn: string; amountIn: bigint; fee: number };
        const zero = p.tokenIn.toLowerCase() === REGISTRY.usdc.toLowerCase();
        // Marginal response at the constructed raw ratio 625000000, with protocol fee included.
        const output = zero
          ? (p.amountIn * 625_000_000n * (1_000_000n - BigInt(p.fee))) / 1_000_000n
          : (p.amountIn * (1_000_000n - BigInt(p.fee))) / 625_000_000_000_000n;
        return reply(r, c.functionName, [output, sqrt + (zero ? -1n : 1n), 0, 100_000n]);
      }
      return undefined;
    },
  });
  return {
    ...f,
    clock,
    advance: (ms: number) => {
      elapsed += ms;
    },
  };
}
