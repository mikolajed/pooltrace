import { randomBytes, randomUUID } from "node:crypto";
import {
  ABI,
  type Clock,
  type Fetch,
  type Hash,
  type Header,
  type Origin,
  POLICY,
  REGISTRY,
  type RegistryObservation,
  type RequestEvidence,
  RpcFailure,
  RpcSession,
  failure,
  systemClock,
  verifyRegistry,
} from "@pooltrace/protocols";
import { readConfig, type BackendConfig } from "./config.ts";

export interface Validation {
  readonly at: number;
  readonly monotonicAt: number;
  readonly canonical: "valid" | "invalidated" | "unavailable";
  readonly reason?: string;
  readonly head: Header | null;
}
export interface Observation {
  readonly attemptId: string;
  readonly origin: Origin;
  readonly chainId: bigint | null;
  readonly providerLabel: string;
  readonly configurationRevision: string;
  readonly implementationRevision: "m1-03-v1";
  readonly policy: typeof POLICY;
  readonly dependencyVersions: { readonly viem: "2.57.20" };
  readonly block: Header | null;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly startedMono: number;
  readonly elapsedMs: number;
  readonly clockInvalid: boolean;
  readonly capabilities: readonly {
    readonly method: string;
    readonly positive: boolean;
    readonly unknownHashRejected: boolean;
    readonly unknownHashTestInput: Hash;
  }[];
  readonly registry: RegistryObservation | null;
  readonly complete: boolean;
  readonly failures: readonly string[];
  readonly validations: readonly Validation[];
  readonly requests: readonly RequestEvidence[];
}
export interface Eligibility {
  readonly canonical: Validation["canonical"];
  readonly freshness: "fresh" | "stale" | "historical" | "fixture" | "unavailable";
  readonly blockAgeMs: number | null;
  readonly signedClockOffsetMs: number | null;
  readonly headLag: string | null;
  readonly validationExpired: boolean;
  readonly eligibleForLiveQualification: boolean;
  readonly finiteSizeSuitability: "unavailable";
  readonly workloadAdmitted: false;
}
export interface Options {
  readonly clock?: Clock;
  readonly fetch?: Fetch;
  readonly signal?: AbortSignal;
  readonly origin?: Origin;
  readonly blockNumber?: bigint;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function checkTime(
  observation: Pick<Observation, "startedAt" | "startedMono" | "clockInvalid">,
  clock: Clock,
): boolean {
  const wall = clock.wall() - observation.startedAt;
  const mono = clock.mono() - observation.startedMono;
  return observation.clockInvalid || wall < 0 || mono < 0 || wall + 2 < mono;
}
export function eligibility(observation: Observation, clock: Clock = systemClock): Eligibility {
  const last = observation.validations.at(-1);
  const canonical = observation.validations.some((v) => v.canonical === "invalidated")
    ? "invalidated"
    : (last?.canonical ?? "unavailable");
  const now = clock.wall();
  const mono = clock.mono();
  const blockMs = observation.block ? Number(observation.block.timestamp * 1000n) : NaN;
  const signedAge = now - blockMs;
  const age =
    Number.isSafeInteger(blockMs) && Number.isFinite(signedAge) ? Math.max(0, signedAge) : null;
  const headLag =
    observation.block && last?.head ? last.head.number - observation.block.number : null;
  const invalidClock =
    checkTime(observation, clock) ||
    signedAge < -POLICY.futureToleranceMs ||
    (last !== undefined && (now < last.at || mono < last.monotonicAt));
  const validationExpired = !last || mono - last.monotonicAt > POLICY.maxValidationAgeMs;
  let freshness: Eligibility["freshness"] =
    invalidClock || age === null || headLag === null || headLag < 0n
      ? "unavailable"
      : observation.origin === "historical"
        ? "historical"
        : observation.origin === "fixture"
          ? "fixture"
          : age > POLICY.maxBlockAgeMs || headLag > POLICY.maxHeadLag
            ? "stale"
            : "fresh";
  if (!observation.block) freshness = "unavailable";
  return {
    canonical,
    freshness,
    blockAgeMs: age,
    signedClockOffsetMs: age === null ? null : signedAge,
    headLag: headLag?.toString() ?? null,
    validationExpired,
    eligibleForLiveQualification:
      observation.origin === "live" &&
      freshness === "fresh" &&
      canonical === "valid" &&
      !validationExpired &&
      observation.complete &&
      observation.registry?.identity === "passed" &&
      observation.registry.structural === "passed",
    finiteSizeSuitability: "unavailable",
    workloadAdmitted: false,
  };
}

async function validate(rpc: RpcSession, block: Header): Promise<Validation> {
  try {
    if ((await rpc.chain()) !== 1n) throw new RpcFailure("configuration");
    const canonical = await rpc.block(block.number);
    if (canonical.number !== block.number || canonical.hash !== block.hash)
      return {
        at: rpc.clock.wall(),
        monotonicAt: rpc.clock.mono(),
        canonical: "invalidated",
        reason: "hash_replaced",
        head: null,
      };
    if (canonical.parentHash !== block.parentHash || canonical.timestamp !== block.timestamp)
      throw new RpcFailure("malformed");
    const head = await rpc.block("latest");
    if (head.number < block.number || (head.number === block.number && head.hash !== block.hash))
      throw new RpcFailure("malformed");
    return { at: rpc.clock.wall(), monotonicAt: rpc.clock.mono(), canonical: "valid", head };
  } catch (error) {
    const safe = failure(error);
    return {
      at: rpc.clock.wall(),
      monotonicAt: rpc.clock.mono(),
      canonical: safe.reason === "noncanonical" ? "invalidated" : "unavailable",
      reason: safe.reason,
      head: null,
    };
  }
}

export async function collectSnapshot(
  input: BackendConfig,
  options: Options = {},
): Promise<Observation> {
  // Validate caller-supplied configuration too, not only environment configuration.
  const config = readConfig({
    ETHEREUM_RPC_URL: input.rpcUrl,
    RPC_PROVIDER_LABEL: input.providerLabel,
    RPC_CONFIG_REVISION: input.configurationRevision,
  });
  const clock = options.clock ?? systemClock;
  const origin = options.origin ?? (options.blockNumber === undefined ? "live" : "historical");
  if (
    (origin === "fixture" && !options.fetch) ||
    (origin === "live" && options.blockNumber !== undefined) ||
    (options.blockNumber !== undefined && options.blockNumber < 0n)
  )
    throw new RpcFailure("configuration");
  const rpc = new RpcSession({ url: config.rpcUrl, ...options });
  let block: Header | null = null;
  let chainId: bigint | null = null;
  let registry: RegistryObservation | null = null;
  const failures: string[] = [];
  const capabilities: Array<Observation["capabilities"][number]> = [];
  const validations: Validation[] = [];
  try {
    chainId = await rpc.chain();
    if (chainId !== 1n) throw new RpcFailure("configuration");
    block = await rpc.block(options.blockNumber ?? "latest");
    if (options.blockNumber !== undefined && block.number !== options.blockNumber)
      throw new RpcFailure("malformed");
    const unknownHash = `0x${randomBytes(32).toString("hex")}` as Hash;
    for (const method of ["eth_getCode", "eth_call"]) {
      const read = (hash: Hash) =>
        method === "eth_getCode"
          ? rpc.code(REGISTRY.usdc, hash)
          : rpc.contract(REGISTRY.usdc, ABI.decimals, [], hash);
      await read(block.hash);
      let unknownHashRejected = false;
      try {
        await read(unknownHash);
      } catch (error) {
        if (failure(error).reason === "state_unavailable") unknownHashRejected = true;
        else throw error;
      }
      capabilities.push({
        method,
        positive: true,
        unknownHashRejected,
        unknownHashTestInput: unknownHash,
      });
      if (!unknownHashRejected) throw new RpcFailure("unsupported");
    }
    registry = await verifyRegistry(rpc, block.hash);
    if (registry.checks.some((c) => c.reason === "noncanonical")) {
      validations.push({
        at: clock.wall(),
        monotonicAt: clock.mono(),
        canonical: "invalidated",
        reason: "noncanonical",
        head: null,
      });
    } else validations.push(await validate(rpc, block));
  } catch (error) {
    const reason = failure(error).reason;
    failures.push(reason);
    validations.push({
      at: clock.wall(),
      monotonicAt: clock.mono(),
      canonical: reason === "noncanonical" ? "invalidated" : "unavailable",
      reason,
      head: null,
    });
  } finally {
    rpc.close();
  }
  const finishedAt = clock.wall();
  const elapsedMs = clock.mono() - rpc.startedMono;
  return freeze({
    attemptId: randomUUID(),
    origin,
    chainId,
    providerLabel: config.providerLabel,
    configurationRevision: config.configurationRevision,
    implementationRevision: "m1-03-v1",
    policy: POLICY,
    dependencyVersions: { viem: "2.57.20" },
    block,
    startedAt: rpc.startedWall,
    startedMono: rpc.startedMono,
    finishedAt,
    elapsedMs,
    clockInvalid:
      rpc.clockInvalid ||
      finishedAt < rpc.startedWall ||
      elapsedMs < 0 ||
      finishedAt - rpc.startedWall + 2 < elapsedMs,
    capabilities,
    registry,
    complete:
      failures.length === 0 &&
      registry !== null &&
      registry.pools.length === 3 &&
      registry.checks.every((c) => c.status !== "unavailable"),
    failures,
    validations,
    requests: rpc.requests,
  });
}

export async function revalidateSnapshot(
  observation: Observation,
  config: BackendConfig,
  options: Omit<Options, "origin" | "blockNumber"> = {},
): Promise<Observation> {
  if (
    !observation.block ||
    !observation.registry ||
    observation.validations.some((v) => v.canonical === "invalidated")
  )
    return observation;
  const validated = readConfig({
    ETHEREUM_RPC_URL: config.rpcUrl,
    RPC_PROVIDER_LABEL: config.providerLabel,
    RPC_CONFIG_REVISION: config.configurationRevision,
  });
  if (
    observation.providerLabel !== validated.providerLabel ||
    observation.configurationRevision !== validated.configurationRevision ||
    observation.registry.source.revision !== REGISTRY.revision ||
    observation.policy.revision !== POLICY.revision
  )
    throw new RpcFailure("configuration");
  const rpc = new RpcSession({ url: config.rpcUrl, ...options });
  try {
    const event = await validate(rpc, observation.block);
    return freeze({
      ...observation,
      clockInvalid: rpc.clockInvalid || checkTime(observation, rpc.clock),
      validations: [...observation.validations, event],
      requests: [...observation.requests, ...rpc.requests],
    });
  } finally {
    rpc.close();
  }
}

export async function prepareForUse(
  observation: Observation,
  config: BackendConfig,
  options: Omit<Options, "origin" | "blockNumber"> = {},
): Promise<{ observation: Observation; eligibility: Eligibility }> {
  const state = eligibility(observation, options.clock);
  const refreshed =
    state.validationExpired && state.canonical !== "invalidated"
      ? await revalidateSnapshot(observation, config, options)
      : observation;
  return { observation: refreshed, eligibility: eligibility(refreshed, options.clock) };
}
