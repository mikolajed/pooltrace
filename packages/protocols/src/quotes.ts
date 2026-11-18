import { getAddress, keccak256, type Address, type Hash } from "viem";
import {
  DomainError,
  QUOTE_POLICY,
  uint,
  v2Output,
  ratio,
  v3Ratio,
  priceLimit,
  fullInput,
  impact,
  type Impact,
  type Ratio,
} from "@pooltrace/domain";
import { REGISTRY, ABI, address, type PoolObservation } from "./registry.ts";
import { type Check, failure } from "./types.ts";
import type { RpcSession } from "./rpc.ts";

export const QUOTE_SOURCE = Object.freeze({
  revision: "ethereum-quotes-v1",
  retrievedAt: "2026-11-18",
  sourceRevisions: {
    v2Periphery: "ed24991304291297c3b4a52818d02f46a17aa9a2",
    v3Periphery: "24ccf014fe7f81d74a14c1689d6fdf123f280e45",
    v3Core: "5ea68a77cb541c6b3812df783be71ba8c081e25f",
  },
  router: getAddress("0x7a250d5630b4cf539739df2c5dacb4c659f2488d"),
  quoter: getAddress("0x61ffe014ba17989e743c5f6cb21bf9697530b21e"),
  sources: [
    "https://developers.uniswap.org/docs/protocols/v2/deployments",
    "https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments",
    "https://raw.githubusercontent.com/Uniswap/v2-periphery/ed24991304291297c3b4a52818d02f46a17aa9a2/contracts/libraries/UniswapV2Library.sol",
    "https://raw.githubusercontent.com/Uniswap/v3-periphery/24ccf014fe7f81d74a14c1689d6fdf123f280e45/contracts/interfaces/IQuoterV2.sol",
    "https://raw.githubusercontent.com/Uniswap/v3-periphery/24ccf014fe7f81d74a14c1689d6fdf123f280e45/contracts/lens/QuoterV2.sol",
    "https://raw.githubusercontent.com/Uniswap/v3-core/5ea68a77cb541c6b3812df783be71ba8c081e25f/contracts/UniswapV3Pool.sol",
    "https://raw.githubusercontent.com/Uniswap/v3-core/5ea68a77cb541c6b3812df783be71ba8c081e25f/contracts/libraries/TickMath.sol",
  ],
});
export const QUOTE_ABI = {
  compare: "function getAmountsOut(uint256,address[]) view returns (uint256[])",
  quote:
    "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
  weth: "function WETH() view returns (address)",
  weth9: "function WETH9() view returns (address)",
} as const;
export interface QuotationContracts {
  readonly source: typeof QUOTE_SOURCE;
  readonly checks: readonly Check[];
  readonly codeHashes: Readonly<Record<string, Hash>>;
  readonly identity: "passed" | "rejected" | "unavailable";
}
export function safeReason(error: unknown): string {
  return error instanceof DomainError ? error.reason : failure(error).reason;
}
export async function verifyQuotationContracts(
  rpc: RpcSession,
  hash: Hash,
): Promise<QuotationContracts> {
  const checks: Check[] = [],
    codeHashes: Record<string, Hash> = {};
  for (const [target, factory, wethSignature] of [
    [QUOTE_SOURCE.router, REGISTRY.v2Factory, QUOTE_ABI.weth],
    [QUOTE_SOURCE.quoter, REGISTRY.v3Factory, QUOTE_ABI.weth9],
  ] as const) {
    for (const name of ["code", "factory", "weth"] as const) {
      try {
        let observed: string | boolean;
        let passed: boolean;
        if (name === "code") {
          const bytes = await rpc.code(target, hash);
          passed = bytes !== undefined && bytes !== "0x";
          observed = passed;
          if (bytes) codeHashes[target] = keccak256(bytes);
        } else {
          observed = address(
            await rpc.contract(
              target,
              name === "factory" ? ABI.factory : wethSignature,
              [],
              hash,
              QUOTE_POLICY.callGas,
            ),
          );
          passed = observed === (name === "factory" ? factory : REGISTRY.weth);
        }
        checks.push({
          name: `${target}:${name}`,
          status: passed ? "passed" : "rejected",
          observed,
          ...(passed ? {} : { reason: "expectation_mismatch" }),
        });
      } catch (error) {
        checks.push({
          name: `${target}:${name}`,
          status: "unavailable",
          reason: safeReason(error),
        });
      }
    }
  }
  return {
    source: QUOTE_SOURCE,
    checks,
    codeHashes,
    identity: checks.some((c) => c.status === "rejected")
      ? "rejected"
      : checks.every((c) => c.status === "passed")
        ? "passed"
        : "unavailable",
  };
}
export interface LegQuote {
  readonly quoteId: string;
  readonly analysisId: string;
  readonly observationId: string;
  readonly pool: Address;
  readonly protocol: "v2" | "v3";
  readonly fee: number;
  readonly blockHash: Hash;
  readonly tokenIn: Address;
  readonly tokenOut: Address;
  readonly input: bigint;
  readonly target: Address;
  readonly method: string;
  readonly gas: bigint;
  readonly status: "passed" | "rejected" | "unavailable";
  readonly reason: string | null;
  readonly output: bigint | null;
  readonly fullInput: boolean;
  readonly impact: Impact | null;
  readonly evidence: Readonly<Record<string, string | number | bigint | boolean>>;
}
export async function quoteLeg(
  rpc: RpcSession,
  pool: PoolObservation,
  input: bigint,
  tokenIn: Address,
  ids: { analysisId: string; observationId: string; quoteId: string },
): Promise<LegQuote> {
  const tokenOut = tokenIn === REGISTRY.usdc ? REGISTRY.weth : REGISTRY.usdc;
  const base = {
    ...ids,
    pool: pool.address,
    protocol: pool.protocol,
    fee: pool.fee,
    blockHash: pool.blockHash,
    tokenIn,
    tokenOut,
    input,
    target: pool.protocol === "v2" ? QUOTE_SOURCE.router : QUOTE_SOURCE.quoter,
    method: pool.protocol === "v2" ? "getAmountsOut" : "quoteExactInputSingle",
    gas: QUOTE_POLICY.callGas,
  };
  let output: bigint | null = null,
    complete = false,
    measured: Impact | null = null;
  const evidence: Record<string, string | number | bigint | boolean> = {};
  try {
    const zeroForOne = tokenIn === pool.values.token0;
    if (tokenIn !== pool.values.token0 && tokenIn !== pool.values.token1)
      throw new DomainError("token_identity");
    let reference: Ratio;
    if (pool.protocol === "v2") {
      const reserveIn = uint(zeroForOne ? pool.values.reserve0 : pool.values.reserve1, 112);
      const reserveOut = uint(zeroForOne ? pool.values.reserve1 : pool.values.reserve0, 112);
      output = v2Output(input, reserveIn, reserveOut);
      complete = true;
      reference = ratio(reserveOut, reserveIn);
      const compared = await rpc.contract(
        QUOTE_SOURCE.router,
        QUOTE_ABI.compare,
        [input, [tokenIn, tokenOut]],
        pool.blockHash,
        QUOTE_POLICY.callGas,
      );
      if (!Array.isArray(compared) || compared.length !== 2)
        throw new DomainError("comparison_malformed");
      evidence.comparedInput = uint(compared[0]);
      evidence.comparedOutput = uint(compared[1]);
      if (evidence.comparedInput !== input || evidence.comparedOutput !== output)
        return {
          ...base,
          status: "rejected",
          reason: "protocol_mismatch",
          output,
          fullInput: complete,
          impact: null,
          evidence,
        };
    } else {
      if (input <= 0n || input >= 1n << 255n) throw new DomainError("input_range");
      const before = uint(pool.values.sqrtPriceX96, 160);
      const limit = priceLimit(before, zeroForOne);
      Object.assign(evidence, { sqrtBefore: before, limit });
      reference = v3Ratio(before, zeroForOne);
      const returned = await rpc.contract(
        QUOTE_SOURCE.quoter,
        QUOTE_ABI.quote,
        [{ tokenIn, tokenOut, amountIn: input, fee: pool.fee, sqrtPriceLimitX96: limit }],
        pool.blockHash,
        QUOTE_POLICY.callGas,
      );
      if (!Array.isArray(returned) || returned.length !== 4)
        throw new DomainError("quote_malformed");
      output = uint(returned[0]);
      const after = uint(returned[1], 160);
      const crossed = returned[2];
      if (
        typeof crossed !== "number" ||
        !Number.isInteger(crossed) ||
        crossed < 0 ||
        crossed > 0xffffffff
      )
        throw new DomainError("quote_malformed");
      Object.assign(evidence, {
        sqrtAfter: after,
        initializedTicksCrossed: crossed,
        gasEstimate: uint(returned[3]),
      });
      complete = fullInput(before, after, limit, zeroForOne);
      if (!complete)
        return {
          ...base,
          status: "rejected",
          reason: "full_input_not_proven",
          output,
          fullInput: false,
          impact: null,
          evidence,
        };
    }
    measured = impact(input, output, reference, pool.fee);
    return {
      ...base,
      status: measured.passed ? "passed" : "rejected",
      reason: output === 0n ? "zero_output" : measured.passed ? null : "impact",
      output,
      fullInput: complete,
      impact: measured,
      evidence,
    };
  } catch (error) {
    const reason = safeReason(error);
    const rejected = ["reserve_headroom", "nonpositive", "input_range", "starting_limit"].includes(
      reason,
    );
    return {
      ...base,
      status: rejected ? "rejected" : "unavailable",
      reason,
      output,
      fullInput: complete,
      impact: measured,
      evidence,
    };
  }
}
