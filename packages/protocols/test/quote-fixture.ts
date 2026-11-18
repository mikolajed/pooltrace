// Constructed quoting responses only. No address, reserve, price, or output here is market evidence.
import { decodeFunctionData, encodeFunctionResult, parseAbi, type Abi, type Hex } from "viem";
import { ABI, QUOTE_ABI, QUOTE_SOURCE, REGISTRY } from "../src/index.ts";
import { fixture, success, error, BLOCK_HASH, type WireRequest } from "./fixture.ts";

const abi: Abi = parseAbi([...Object.values(ABI), ...Object.values(QUOTE_ABI)]);
export function quoteFixture(
  options: {
    kind?: "partial" | "opposite" | "impact" | "zero" | "wrong_factory" | "comparison";
    intercept?: (r: WireRequest) => Response | Promise<Response> | undefined;
  } = {},
) {
  return fixture({
    override: (_target, name) => (name === "getReserves" ? [10n ** 30n, 10n ** 30n, 1] : undefined),
    intercept: async (r) => {
      const result = await options.intercept?.(r);
      if (result) return result;
      if (r.method !== "eth_call") return undefined;
      const tx = r.params[0] as { to: string; data: Hex };
      const target = tx.to.toLowerCase();
      if (![QUOTE_SOURCE.router.toLowerCase(), QUOTE_SOURCE.quoter.toLowerCase()].includes(target))
        return undefined;
      if ((r.params[1] as { blockHash: string }).blockHash !== BLOCK_HASH)
        return error(r, "header not found");
      const { functionName: name, args = [] } = decodeFunctionData({ abi, data: tx.data });
      let value: unknown;
      if (name === "factory")
        value =
          options.kind === "wrong_factory"
            ? REGISTRY.usdc
            : target === QUOTE_SOURCE.router.toLowerCase()
              ? REGISTRY.v2Factory
              : REGISTRY.v3Factory;
      else if (name === "WETH" || name === "WETH9") value = REGISTRY.weth;
      else if (name === "getAmountsOut") {
        const input = args[0] as bigint,
          R = 10n ** 30n,
          den = R * 1000n + input * 997n;
        // Independent inverse-reserve form for the synthetic two equal reserves.
        const output = R - (R * R * 1000n + den - 1n) / den;
        value = [input, output + (options.kind === "comparison" ? 1n : 0n)];
      } else if (name === "quoteExactInputSingle") {
        const p = args[0] as {
          tokenIn: string;
          amountIn: bigint;
          fee: number;
          sqrtPriceLimitX96: bigint;
        };
        const zero = p.tokenIn.toLowerCase() === REGISTRY.usdc.toLowerCase(),
          before = 1n << 96n;
        let output = (p.amountIn * (1_000_000n - BigInt(p.fee))) / 1_000_000n;
        if (options.kind === "impact") output /= 2n;
        if (options.kind === "zero") output = 0n;
        const after =
          options.kind === "partial"
            ? p.sqrtPriceLimitX96
            : options.kind === "opposite"
              ? before + (zero ? 1n : -1n)
              : before + (zero ? -1n : 1n);
        value = [output, after, 0, 100_000n];
      } else return undefined;
      return success(r, encodeFunctionResult({ abi, functionName: name, result: value }));
    },
  });
}
