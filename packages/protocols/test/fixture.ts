// Constructed responses only. Pool addresses, prices, reserves and times are not market evidence.
import {
  type Abi,
  type Address,
  type Hex,
  decodeFunctionData,
  encodeFunctionResult,
  parseAbi,
} from "viem";
import { ABI, REGISTRY, type Fetch } from "../src/index.ts";

export const BLOCK_HASH = `0x${"aa".repeat(32)}` as const;
export const OTHER_HASH = `0x${"bb".repeat(32)}` as const;
export const POOLS: readonly Address[] = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
];
const abi: Abi = parseAbi(Object.values(ABI));
export interface WireRequest {
  id: number;
  method: string;
  params: readonly unknown[];
}
export function success(request: WireRequest, result: unknown): Response {
  return Response.json({ jsonrpc: "2.0", id: request.id, result });
}
export function error(request: WireRequest, message: string, code = -32000): Response {
  return Response.json({ jsonrpc: "2.0", id: request.id, error: { code, message } });
}
export function fixture(
  options: {
    override?: (target: string, name: string, args: readonly unknown[]) => unknown;
    intercept?: (request: WireRequest) => Response | Promise<Response | undefined> | undefined;
    ignoreHash?: boolean;
  } = {},
) {
  const calls: WireRequest[] = [];
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const rawBlock = {
    number: "0x64",
    hash: BLOCK_HASH,
    parentHash: OTHER_HASH,
    timestamp: `0x${timestamp.toString(16)}`,
  };
  const fetcher: Fetch = async (_url, init) => {
    const request = JSON.parse(String(init.body)) as WireRequest;
    calls.push(request);
    const intercepted = await options.intercept?.(request);
    if (intercepted) return intercepted;
    if (request.method === "eth_chainId") return success(request, "0x1");
    if (request.method === "eth_getBlockByNumber") return success(request, rawBlock);
    const block = request.params[1] as { blockHash?: string };
    if (!options.ignoreHash && block.blockHash !== BLOCK_HASH)
      return error(request, `header for ${block.blockHash} not found`);
    if (request.method === "eth_getCode") return success(request, "0x60006000");
    const tx = request.params[0] as { to: string; data: Hex };
    const decoded = decodeFunctionData({ abi, data: tx.data });
    const name = decoded.functionName;
    const args = decoded.args ?? [];
    const target = tx.to.toLowerCase();
    let result: unknown = options.override?.(target, name, args);
    if (result === undefined) {
      const index = POOLS.findIndex((p) => p.toLowerCase() === target);
      const fee = index === 1 ? 500 : 3000;
      const defaults: Record<string, unknown> = {
        decimals: target === REGISTRY.usdc.toLowerCase() ? 6 : 18,
        getPair: POOLS[0],
        getPool: args[2] === 500 ? POOLS[1] : POOLS[2],
        factory: index === 0 ? REGISTRY.v2Factory : REGISTRY.v3Factory,
        token0: REGISTRY.usdc,
        token1: REGISTRY.weth,
        fee,
        tickSpacing: fee === 500 ? 10 : 60,
        feeAmountTickSpacing: args[0] === 500 ? 10 : 60,
        getReserves: [10n ** 25n, 10n ** 30n, 1],
        liquidity: 10n ** 30n,
        slot0: [2n ** 96n, 0, 0, 1, 1, 0, true],
      };
      result = defaults[name];
    }
    return success(request, encodeFunctionResult({ abi, functionName: name, result }));
  };
  return { fetch: fetcher, calls, rawBlock };
}
