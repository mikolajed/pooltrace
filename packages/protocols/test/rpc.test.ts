import { afterEach, describe, expect, it, vi } from "vitest";
import { ABI, POLICY, REGISTRY, RpcSession, jsonEvidence } from "../src/index.ts";
import { BLOCK_HASH, error, fixture, success, type WireRequest } from "./fixture.ts";

const sessions: RpcSession[] = [];
function session(fetcher = fixture().fetch, signal?: AbortSignal) {
  const rpc = new RpcSession({
    url: "https://fixture.invalid/private-key",
    fetch: fetcher,
    ...(signal ? { signal } : {}),
  });
  sessions.push(rpc);
  return rpc;
}
afterEach(() => {
  for (const session of sessions.splice(0)) session.close();
  vi.useRealTimers();
});

describe("bounded read-only RPC transport (V01/V02/V08/V13/V14/V17)", () => {
  it("puts the hash and canonical flag on actual viem code and contract calls", async () => {
    const f = fixture();
    const rpc = session(f.fetch);
    await rpc.code(REGISTRY.usdc, BLOCK_HASH);
    expect(await rpc.contract(REGISTRY.usdc, ABI.decimals, [], BLOCK_HASH)).toBe(6);
    expect(f.calls).toHaveLength(2);
    for (const call of f.calls)
      expect(call.params[1]).toEqual({ blockHash: BLOCK_HASH, requireCanonical: true });
    await expect(rpc.request("eth_call", [{}, "latest"])).rejects.toMatchObject({
      reason: "configuration",
    });
    await expect(rpc.request("eth_sendTransaction", [])).rejects.toMatchObject({
      reason: "configuration",
    });
    expect(f.calls).toHaveLength(2);
  });

  it("retries a 429 once, honors Retry-After, and has no hidden SDK retries", async () => {
    vi.useFakeTimers();
    let sends = 0;
    const rpc = session(async (_url, init) => {
      const req = JSON.parse(String(init.body)) as WireRequest;
      return ++sends === 1
        ? new Response("private-key", { status: 429, headers: { "retry-after": "1" } })
        : success(req, "0x1");
    });
    const promise = rpc.chain();
    await vi.advanceTimersByTimeAsync(999);
    expect(sends).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await promise).toBe(1n);
    expect(sends).toBe(2);
  });

  it("ends instead of waiting beyond the attempt budget", async () => {
    const rpc = session(
      async () => new Response("secret", { status: 503, headers: { "retry-after": "60" } }),
    );
    await expect(rpc.chain()).rejects.toMatchObject({ reason: "deadline" });
    expect(rpc.requests).toHaveLength(1);
  });

  it.each(["network", "429", "503"])(
    "bounds actual viem retries for %s at the original block hash",
    async (kind) => {
      vi.useFakeTimers();
      const sent: WireRequest[] = [];
      const rpc = session(async (_url, init) => {
        sent.push(JSON.parse(String(init.body)) as WireRequest);
        if (kind === "network") throw new TypeError("private-key");
        return new Response("private-key", { status: Number(kind) });
      });
      const result = rpc
        .contract(REGISTRY.usdc, ABI.decimals, [], BLOCK_HASH)
        .catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(251);
      expect(await result).toMatchObject({
        reason: kind === "network" ? "network" : kind === "429" ? "rate_limited" : "server",
      });
      expect(sent).toHaveLength(2);
      expect(sent.every((r) => r.method === "eth_call")).toBe(true);
      expect(sent[0]?.params).toEqual(sent[1]?.params);
      expect(sent[0]?.params[1]).toEqual({ blockHash: BLOCK_HASH, requireCanonical: true });
    },
  );

  it.each([401, 403, 400])("does not retry terminal HTTP %i", async (status) => {
    let sends = 0;
    const rpc = session(async () => {
      sends++;
      return new Response("secret", { status });
    });
    await expect(rpc.chain()).rejects.toBeDefined();
    expect(sends).toBe(1);
    expect(jsonEvidence(rpc.requests)).not.toContain("secret");
  });

  it.each([
    [-32602, "invalid block selector", "unsupported"],
    [-32000, "execution reverted", "reverted"],
    [-32000, "ambiguous private-key failure", "rpc"],
    [-32000, "block is not canonical", "noncanonical"],
  ])(
    "classifies context without retaining unsafe provider diagnostics",
    async (code, message, reason) => {
      const f = fixture({ intercept: (r) => error(r, String(message), Number(code)) });
      const rpc = session(f.fetch);
      const outcome = await rpc.code(REGISTRY.usdc, BLOCK_HASH).catch((e: unknown) => e);
      expect(outcome).toMatchObject({ reason });
      expect(f.calls).toHaveLength(1);
      expect(jsonEvidence(outcome)).not.toContain("private-key");
    },
  );

  it("rejects malformed/missing responses without a retry", async () => {
    const rpc = session(async () => Response.json({ jsonrpc: "2.0", id: 1 }));
    await expect(rpc.chain()).rejects.toMatchObject({ reason: "malformed" });
    expect(rpc.requests).toHaveLength(1);
  });

  it("enforces per-request timeouts even if a fetch implementation ignores cancellation", async () => {
    vi.useFakeTimers();
    let sends = 0;
    const rpc = session(async () => {
      sends++;
      return new Promise<Response>(() => {});
    });
    const result = rpc.chain().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10_251);
    expect(await result).toMatchObject({ reason: "timeout" });
    expect(sends).toBe(2);
  });

  it("cancels queued and active work, ignoring late responses", async () => {
    const controller = new AbortController();
    const pending: Array<() => void> = [];
    const rpc = session(async (_url, init) => {
      const req = JSON.parse(String(init.body)) as WireRequest;
      return new Promise<Response>((resolve) => pending.push(() => resolve(success(req, "0x1"))));
    }, controller.signal);
    const results = Promise.all(
      Array.from({ length: 9 }, () => rpc.chain().catch((e: unknown) => e)),
    );
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(pending).toHaveLength(POLICY.concurrency);
    controller.abort();
    const outcomes = await results;
    expect(
      outcomes.every(
        (v) => typeof v === "object" && v !== null && "reason" in v && v.reason === "cancelled",
      ),
    ).toBe(true);
    for (const release of pending) release();
    expect(pending).toHaveLength(4);
  });

  it("sends at most four requests at once and releases slots normally", async () => {
    let active = 0;
    let peak = 0;
    const rpc = session(async (_url, init) => {
      const req = JSON.parse(String(init.body)) as WireRequest;
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return success(req, "0x1");
    });
    expect(await Promise.all(Array.from({ length: 12 }, () => rpc.chain()))).toHaveLength(12);
    expect(peak).toBe(4);
  });

  it("bounds queued work by the attempt deadline", async () => {
    vi.useFakeTimers();
    const rpc = session(async () => new Promise<Response>(() => {}));
    const results = Promise.all(
      Array.from({ length: 30 }, () => rpc.chain().catch((e: unknown) => e)),
    );
    await vi.advanceTimersByTimeAsync(POLICY.attemptTimeoutMs + 1);
    const outcomes = await results;
    expect(
      outcomes.some(
        (e) => typeof e === "object" && e !== null && "reason" in e && e.reason === "deadline",
      ),
    ).toBe(true);
    expect(rpc.requests.length).toBeLessThanOrEqual(16);
  });
});
