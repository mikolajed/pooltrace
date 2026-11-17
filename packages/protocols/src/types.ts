import type { Hash } from "viem";
export type { Hash, Address, Hex } from "viem";

export type Origin = "live" | "historical" | "fixture";
export type FailureReason =
  | "configuration"
  | "cancelled"
  | "deadline"
  | "timeout"
  | "network"
  | "rate_limited"
  | "server"
  | "authorization"
  | "unsupported"
  | "reverted"
  | "state_unavailable"
  | "noncanonical"
  | "malformed"
  | "rpc";

// Errors deliberately retain no provider message, URL, response body, headers, or cause.
export class RpcFailure extends Error {
  readonly reason: FailureReason;
  readonly retryAfterMs: number;
  constructor(reason: FailureReason, retryAfterMs = 0) {
    super(`RPC ${reason}`);
    this.name = "RpcFailure";
    this.reason = reason;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface Clock {
  wall(): number;
  mono(): number;
}
export const systemClock: Clock = { wall: () => Date.now(), mono: () => performance.now() };

export const POLICY = Object.freeze({
  revision: "adr-0005-v1",
  maxBlockAgeMs: 30_000,
  maxHeadLag: 2n,
  maxValidationAgeMs: 5_000,
  futureToleranceMs: 2_000,
  requestTimeoutMs: 5_000,
  attemptTimeoutMs: 20_000,
  concurrency: 4,
  retryWaitMs: 250,
  maxSends: 2,
});

export interface Header {
  readonly number: bigint;
  readonly hash: Hash;
  readonly parentHash: Hash;
  readonly timestamp: bigint;
}
export interface RequestEvidence {
  readonly method: string;
  readonly send: number;
  readonly outcome: "success" | FailureReason;
}
export interface Check {
  readonly name: string;
  readonly status: "passed" | "rejected" | "unavailable";
  readonly reason?: string;
  readonly observed?: string | number | bigint | boolean;
}
export function failure(error: unknown): RpcFailure {
  // viem wraps transport errors. Traverse in memory, but never copy unsafe diagnostics.
  let current: unknown = error;
  for (let depth = 0; depth < 12 && current instanceof Error; depth++) {
    if (current instanceof RpcFailure) return current;
    current = current.cause;
  }
  return new RpcFailure("malformed");
}
export function jsonEvidence(value: unknown): string {
  return JSON.stringify(
    value,
    (_, item: unknown) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}
