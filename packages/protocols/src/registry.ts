import { type Address, type Hash, getAddress, keccak256 } from "viem";
import type { RpcSession } from "./rpc.ts";
import { type Check, RpcFailure, failure } from "./types.ts";

// Documentation-sourced candidates, not a list of assumed verified pool deployments.
// Source and retrieval provenance is retained with each observation.
export const REGISTRY = Object.freeze({
  revision: "ethereum-weth-usdc-v1",
  retrievedAt: "2026-11-17",
  usdc: getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
  weth: getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
  v2Factory: getAddress("0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"),
  v3Factory: getAddress("0x1f98431c8ad98523631ae4a59f267346ea31f984"),
  fees: [500, 3000] as const,
  sources: [
    "https://developers.circle.com/stablecoins/usdc-contract-addresses",
    "https://developers.uniswap.org/docs/sdks/v3/guides/pool-data",
    "https://developers.uniswap.org/docs/protocols/v2/deployments",
    "https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments",
    "https://github.com/Uniswap/v2-core/blob/master/contracts/interfaces/IUniswapV2Pair.sol",
    "https://github.com/Uniswap/v3-core/blob/main/contracts/interfaces/pool/IUniswapV3PoolState.sol",
  ],
});
export const ABI = {
  decimals: "function decimals() view returns (uint8)",
  pair: "function getPair(address,address) view returns (address)",
  pool: "function getPool(address,address,uint24) view returns (address)",
  spacing: "function feeAmountTickSpacing(uint24) view returns (int24)",
  factory: "function factory() view returns (address)",
  token0: "function token0() view returns (address)",
  token1: "function token1() view returns (address)",
  fee: "function fee() view returns (uint24)",
  tickSpacing: "function tickSpacing() view returns (int24)",
  reserves: "function getReserves() view returns (uint112,uint112,uint32)",
  liquidity: "function liquidity() view returns (uint128)",
  slot0: "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)",
} as const;

export type Screen = "passed" | "rejected" | "unavailable";
export interface PoolObservation {
  readonly protocol: "v2" | "v3";
  readonly fee: number;
  readonly address: Address;
  readonly blockHash: Hash;
  readonly values: Readonly<Record<string, string | number | bigint | boolean>>;
  readonly finiteSizeSuitability: "unavailable";
}
export interface RegistryObservation {
  readonly source: typeof REGISTRY;
  readonly checks: readonly Check[];
  readonly codeHashes: Readonly<Record<string, Hash>>;
  readonly tokens: readonly {
    readonly address: Address;
    readonly expectedDecimals: number;
    readonly observedDecimals: number | null;
  }[];
  readonly pools: readonly PoolObservation[];
  readonly identity: Screen;
  readonly structural: Screen;
  readonly finiteSizeSuitability: "unavailable";
  readonly workloadAdmitted: false;
}
export function address(value: unknown): Address {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value))
    throw new RpcFailure("malformed");
  return getAddress(value.toLowerCase());
}
function integer(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new RpcFailure("malformed");
  return value;
}
function big(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n) throw new RpcFailure("malformed");
  return value;
}
function tuple(value: unknown, length: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length !== length) throw new RpcFailure("malformed");
  return value;
}
function summary(checks: readonly Check[]): Screen {
  if (checks.some((c) => c.status === "rejected")) return "rejected";
  return checks.length > 0 && checks.every((c) => c.status === "passed") ? "passed" : "unavailable";
}

export async function verifyRegistry(
  rpc: RpcSession,
  blockHash: Hash,
): Promise<RegistryObservation> {
  const checks: Check[] = [];
  const identity: Check[] = [];
  const structural: Check[] = [];
  const codeHashes: Record<string, Hash> = {};
  async function inspect<T>(
    name: string,
    group: Check[],
    read: () => Promise<T>,
    accepts: (value: T) => boolean | undefined,
  ): Promise<T | undefined> {
    try {
      const value = await read();
      const accepted = accepts(value);
      const check: Check =
        accepted === undefined
          ? { name, status: "unavailable", reason: "dependency_unavailable" }
          : accepted
            ? { name, status: "passed" }
            : { name, status: "rejected", reason: "expectation_mismatch" };
      const evidence: Check =
        !name.startsWith("code:") &&
        ["string", "number", "bigint", "boolean"].includes(typeof value)
          ? { ...check, observed: value as string | number | bigint | boolean }
          : check;
      checks.push(evidence);
      group.push(evidence);
      return check.status === "passed" ? value : undefined;
    } catch (error) {
      const safe = failure(error);
      const check: Check = { name, status: "unavailable", reason: safe.reason };
      checks.push(check);
      group.push(check);
      return undefined;
    }
  }
  const contract = (target: Address, signature: string, args: readonly unknown[] = []) =>
    rpc.contract(target, signature, args, blockHash);
  const code = async (target: Address) => {
    const bytes = await rpc.code(target, blockHash);
    if (bytes) codeHashes[target] = keccak256(bytes);
    return bytes;
  };
  await Promise.all(
    [REGISTRY.usdc, REGISTRY.weth, REGISTRY.v2Factory, REGISTRY.v3Factory].map((target) =>
      inspect(
        `code:${target}`,
        identity,
        () => code(target),
        (v) => v !== undefined && v !== "0x",
      ),
    ),
  );
  const tokens = await Promise.all(
    [
      [REGISTRY.usdc, 6],
      [REGISTRY.weth, 18],
    ].map(async ([target, expected]) => {
      const token = address(target);
      let observedDecimals: number | null = null;
      await inspect(
        `decimals:${token}`,
        identity,
        async () => {
          observedDecimals = integer(await contract(token, ABI.decimals));
          return observedDecimals;
        },
        (v) => v === expected,
      );
      return { address: token, expectedDecimals: integer(expected), observedDecimals };
    }),
  );

  const discovered = await Promise.all([
    inspect(
      "discover:v2",
      identity,
      async () =>
        address(await contract(REGISTRY.v2Factory, ABI.pair, [REGISTRY.usdc, REGISTRY.weth])),
      (v) => BigInt(v) !== 0n,
    ),
    ...REGISTRY.fees.map((fee) =>
      inspect(
        `discover:v3:${fee}`,
        identity,
        async () =>
          address(
            await contract(REGISTRY.v3Factory, ABI.pool, [REGISTRY.usdc, REGISTRY.weth, fee]),
          ),
        (v) => BigInt(v) !== 0n,
      ),
    ),
  ]);
  const poolAddresses = discovered.filter((v) => v !== undefined);
  if (poolAddresses.length === 3)
    await inspect(
      "distinct_pools",
      identity,
      async () => poolAddresses,
      (v) => new Set(v).size === 3,
    );
  else {
    const check: Check = {
      name: "distinct_pools",
      status: "unavailable",
      reason: "discovery_incomplete",
    };
    checks.push(check);
    identity.push(check);
  }
  const token0 = BigInt(REGISTRY.usdc) < BigInt(REGISTRY.weth) ? REGISTRY.usdc : REGISTRY.weth;
  const token1 = token0 === REGISTRY.usdc ? REGISTRY.weth : REGISTRY.usdc;
  const pools = await Promise.all(
    discovered.map(async (target, index): Promise<PoolObservation | undefined> => {
      if (!target) return undefined;
      const protocol = index === 0 ? "v2" : "v3";
      const fee = index === 0 ? 3000 : REGISTRY.fees[index - 1];
      if (fee === undefined) throw new RpcFailure("configuration");
      const expectedFactory = protocol === "v2" ? REGISTRY.v2Factory : REGISTRY.v3Factory;
      const values: Record<string, string | number | bigint | boolean> = {};
      await inspect(
        `code:${target}`,
        identity,
        () => code(target),
        (v) => v !== undefined && v !== "0x",
      );
      await Promise.all(
        (
          [
            ["factory", ABI.factory, expectedFactory],
            ["token0", ABI.token0, token0],
            ["token1", ABI.token1, token1],
          ] as const
        ).map(async ([name, sig, expected]) => {
          await inspect(
            `${target}:${name}`,
            identity,
            async () => {
              const result = address(await contract(target, sig));
              values[name] = result;
              return result;
            },
            (v) => v === expected,
          );
        }),
      );
      if (protocol === "v2") {
        await inspect(
          `${target}:reserves`,
          structural,
          async () => {
            const v = tuple(await contract(target, ABI.reserves), 3);
            const reserve0 = big(v[0]);
            const reserve1 = big(v[1]);
            const blockTimestampLast = integer(v[2]);
            Object.assign(values, { reserve0, reserve1, blockTimestampLast });
            return reserve0 > 0n && reserve1 > 0n;
          },
          (v) => v,
        );
      } else {
        const spacing = await inspect(
          `${target}:enabled_fee`,
          identity,
          async () => integer(await contract(REGISTRY.v3Factory, ABI.spacing, [fee])),
          (v) => v > 0,
        );
        await Promise.all([
          inspect(
            `${target}:fee`,
            identity,
            async () => {
              const v = integer(await contract(target, ABI.fee));
              values.fee = v;
              return v;
            },
            (v) => v === fee,
          ),
          inspect(
            `${target}:spacing`,
            identity,
            async () => {
              const v = integer(await contract(target, ABI.tickSpacing));
              values.tickSpacing = v;
              return v;
            },
            (v) => (spacing === undefined ? undefined : v === spacing),
          ),
          inspect(
            `${target}:state`,
            structural,
            async () => {
              const [slot, rawLiquidity] = await Promise.all([
                contract(target, ABI.slot0),
                contract(target, ABI.liquidity),
              ]);
              const v = tuple(slot, 7);
              const sqrtPriceX96 = big(v[0]);
              const tick = integer(v[1]);
              const liquidity = big(rawLiquidity);
              if (typeof v[6] !== "boolean") throw new RpcFailure("malformed");
              Object.assign(values, {
                sqrtPriceX96,
                tick,
                observationIndex: integer(v[2]),
                observationCardinality: integer(v[3]),
                observationCardinalityNext: integer(v[4]),
                feeProtocol: integer(v[5]),
                unlocked: v[6],
                liquidity,
              });
              return sqrtPriceX96 > 0n && liquidity > 0n && v[6];
            },
            (v) => v,
          ),
        ]);
      }
      return {
        protocol,
        fee,
        address: target,
        blockHash,
        values,
        finiteSizeSuitability: "unavailable",
      };
    }),
  );
  return {
    source: REGISTRY,
    checks,
    codeHashes,
    tokens,
    pools: pools.filter((v) => v !== undefined),
    identity: summary(identity),
    structural: structural.length === 3 ? summary(structural) : "unavailable",
    finiteSizeSuitability: "unavailable",
    workloadAdmitted: false,
  };
}
