import { afterEach, describe, expect, it, vi } from "vitest";
import { QUOTE_POLICY } from "@pooltrace/domain";
import { REGISTRY, POLICY, jsonEvidence, type Origin } from "@pooltrace/protocols";
import {
  BLOCK_HASH,
  OTHER_HASH,
  error,
  success,
  type WireRequest,
} from "@pooltrace/protocols/fixtures";
import {
  asymmetricFixture,
  call,
  reply,
  sqrt,
} from "../../../packages/protocols/test/validation-fixture.ts";
import {
  collectSnapshot,
  analyzeSnapshot,
  analysisEligibility,
  revalidateAnalysis,
  readConfig,
} from "../src/index.ts";

const config = readConfig({ ETHEREUM_RPC_URL: "https://fixture.invalid/private-key" });
afterEach(() => vi.useRealTimers());
async function collected(f = asymmetricFixture(), origin: Origin = "fixture") {
  const o = await collectSnapshot(config, { fetch: f.fetch, clock: f.clock, origin });
  expect(o.complete).toBe(true);
  return { f, o };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function quoteCall(r: WireRequest) {
  const c = call(r);
  return c?.functionName === "getAmountsOut" || c?.functionName === "quoteExactInputSingle"
    ? c
    : null;
}
function goodPendingV2(r: WireRequest) {
  const input = call(r)?.args?.[0] as bigint;
  const literals = new Map([
    [10_000_000n, 4_984_975_149_898_877n],
    [50_000_000n, 24_924_378_759_859_410n],
    [100_000_000n, 49_847_515_101_372_196n],
  ]);
  const output = literals.get(input);
  if (output === undefined) throw new Error("unexpected controlled input");
  return reply(r, "getAmountsOut", [input, output]);
}
function pinned(requests: readonly WireRequest[]) {
  for (const r of requests.filter((r) => r.method === "eth_call" || r.method === "eth_getCode")) {
    expect(r.params[1]).toEqual({ blockHash: BLOCK_HASH, requireCanonical: true });
    if (r.method === "eth_call") expect((r.params[0] as { gas: string }).gas).toBe("0x4c4b40");
  }
}

describe("M1-07 composition, isolated faults, and running-analysis transitions (R05–R08)", () => {
  it("R05 composes mixed-unit literals once and accounts for 36 unique route/input keys", async () => {
    const { f, o } = await collected(),
      start = f.calls.length;
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
    const keys = a.rows.map((r) => `${r.route.join(":")}:${r.input}`);
    expect(new Set(keys).size).toBe(36);
    for (const route of ["0:1", "0:2", "1:0", "1:2", "2:0", "2:1"])
      expect(a.rows.filter((r) => r.route.join(":") === route).map((r) => r.input)).toEqual([
        10_000_000n,
        50_000_000n,
        100_000_000n,
        500_000_000n,
        1_000_000_000n,
        5_000_000_000n,
      ]);
    const lookup = new Map(a.quotes.map((q) => [q.quoteId, q]));
    for (const r of a.rows) {
      expect(lookup.get(r.leg1 ?? "")?.tokenIn).toBe(REGISTRY.usdc);
      expect(lookup.get(r.leg1 ?? "")?.tokenOut).toBe(REGISTRY.weth);
      expect(lookup.get(r.leg2 ?? "")?.tokenIn).toBe(REGISTRY.weth);
      expect(lookup.get(r.leg2 ?? "")?.tokenOut).toBe(REGISTRY.usdc);
      expect(lookup.get(r.leg2 ?? "")?.input).toBe(lookup.get(r.leg1 ?? "")?.output);
    }
    // Independent Fraction-derived literal paths at 10 USDC; WETH is in 10^-18 units.
    // Constructed V3 marginal replies are inputs to this composition check, not swap evidence.
    const buyV2 = a.rows.find(
      (r) => r.route[0] === 0 && r.route[1] === 1 && r.input === 10_000_000n,
    );
    const buyV3 = a.rows.find(
      (r) => r.route[0] === 1 && r.route[1] === 0 && r.input === 10_000_000n,
    );
    expect(buyV2).toMatchObject({ output: 7_971_972n, gross: -2_028_028n, status: "passed" });
    expect(lookup.get(buyV2?.leg1 ?? "")?.output).toBe(4_984_975_149_898_877n);
    expect(buyV3).toMatchObject({ output: 12_456_191n, gross: 2_456_191n, status: "passed" });
    expect(lookup.get(buyV3?.leg1 ?? "")?.output).toBe(6_246_875_000_000_000n);
    expect(analysisEligibility(a, f.clock)).toMatchObject({
      qualified: true,
      workloadAdmitted: false,
      freshness: "fixture",
    });
    expect(a.transactionCost.status).toBe("unavailable");
    pinned(f.calls.slice(start));
  });

  it.each(["mismatch", "echo", "shape", "malformed", "revert", "missing"] as const)(
    "R06 isolates a first-leg %s fault and keeps the two blocked dependencies",
    async (kind) => {
      let hits = 0;
      const f = asymmetricFixture((r) => {
        const c = quoteCall(r);
        if (c?.functionName !== "getAmountsOut" || c.args?.[0] !== 10_000_000n) return undefined;
        hits++;
        if (kind === "malformed") return success(r, "0x1234");
        if (kind === "revert") return error(r, "execution reverted private-key");
        if (kind === "missing") return Response.json({ jsonrpc: "2.0", id: r.id });
        return reply(
          r,
          c.functionName,
          kind === "shape"
            ? [10_000_000n]
            : [
                kind === "echo" ? 10_000_001n : 10_000_000n,
                kind === "mismatch" ? 4_984_975_149_898_878n : 4_984_975_149_898_877n,
              ],
        );
      });
      const { o } = await collected(f),
        before = jsonEvidence(o);
      const a = await analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
      expect(hits).toBe(1);
      expect(a.rows).toHaveLength(36);
      expect(a.rows.filter((r) => r.status === "passed")).toHaveLength(34);
      const blocked = a.rows.filter((r) => r.status !== "passed");
      const reason =
        kind === "mismatch" || kind === "echo"
          ? "protocol_mismatch"
          : kind === "shape"
            ? "comparison_malformed"
            : kind === "revert"
              ? "reverted"
              : "malformed";
      for (const r of blocked)
        expect(r).toMatchObject({
          input: 10_000_000n,
          leg2: null,
          output: null,
          gross: null,
          reason: `leg1:${reason}`,
        });
      expect(new Set(blocked.map((r) => r.leg1)).size).toBe(1);
      const failed = a.quotes.find((q) => q.quoteId === blocked[0]?.leg1);
      expect(failed?.status).toBe(
        kind === "mismatch" || kind === "echo" ? "rejected" : "unavailable",
      );
      expect(failed?.output).toBe(4_984_975_149_898_877n); // locally computed diagnostic is retained
      expect(failed?.reason).toBe(reason);
      expect(analysisEligibility(a, f.clock)).toMatchObject({ qualified: false, best: null });
      expect(jsonEvidence(a)).not.toContain("private-key");
      expect(jsonEvidence(o)).toBe(before);
    },
  );

  it.each(["zero", "malformed", "revert", "missing"] as const)(
    "R06 isolates a second-leg %s reply without hiding successful rows",
    async (kind) => {
      let hits = 0;
      const f = asymmetricFixture((r) => {
        const c = quoteCall(r),
          p = c?.args?.[0] as { amountIn?: bigint; fee?: number } | undefined;
        if (
          c?.functionName !== "quoteExactInputSingle" ||
          p?.amountIn !== 4_984_975_149_898_877n ||
          p.fee !== 500
        )
          return undefined;
        hits++;
        if (kind === "malformed") return success(r, "0x1234");
        if (kind === "revert") return error(r, "execution reverted private-key");
        if (kind === "missing") return Response.json({ jsonrpc: "2.0", id: r.id });
        return reply(r, c.functionName, [0n, sqrt + 1n, 0, 100_000n]);
      });
      const { o } = await collected(f);
      const a = await analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
      expect(hits).toBe(1);
      expect(a.rows).toHaveLength(36);
      expect(a.rows.filter((r) => r.status === "passed")).toHaveLength(35);
      const failed = a.rows.find((r) => r.status !== "passed");
      expect(failed).toMatchObject({
        route: [0, 1],
        input: 10_000_000n,
        status: kind === "zero" ? "rejected" : "unavailable",
        output: kind === "zero" ? 0n : null,
        gross: kind === "zero" ? -10_000_000n : null,
        reason: `leg2:${kind === "zero" ? "zero_output" : kind === "revert" ? "reverted" : "malformed"}`,
      });
      expect(analysisEligibility(a, f.clock)).toMatchObject({ qualified: false, best: null });
      expect(jsonEvidence(a)).not.toContain("private-key");
    },
  );

  it("R07 makes a noncanonical quote terminal despite later good replies", async () => {
    const started = deferred<void>(),
      pending: Array<{ r: WireRequest; done: (r: Response) => void }> = [];
    const f = asymmetricFixture((r) => {
      if (!quoteCall(r) || pending.length >= 3) return undefined;
      return new Promise<Response>((done) => {
        pending.push({ r, done });
        if (pending.length === 3) started.resolve();
      });
    });
    const { o } = await collected(f),
      before = jsonEvidence(o),
      start = f.calls.length;
    const running = analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
    await started.promise;
    const first = pending[0];
    if (!first) throw new Error("missing pending request");
    first.done(error(first.r, "block is not canonical"));
    // Other already-dispatched requests can succeed; none may resurrect the invalidated attempt.
    for (const item of pending.slice(1)) item.done(goodPendingV2(item.r));
    const a = await running,
      count = f.calls.length;
    expect(analysisEligibility(a, f.clock)).toMatchObject({
      canonical: "invalidated",
      best: null,
      workloadAdmitted: false,
    });
    expect(a.rows).toHaveLength(36);
    expect(a.quotes.some((q) => q.status === "passed")).toBe(true);
    expect(a.observation.block?.hash).toBe(BLOCK_HASH);
    expect(jsonEvidence(o)).toBe(before);
    expect(await revalidateAnalysis(a, config, { fetch: f.fetch, clock: f.clock })).toBe(a);
    expect(f.calls).toHaveLength(count);
    pinned(f.calls.slice(start));
  });

  it("R07 retains hash replacement discovered by renewal while an older quote is pending", async () => {
    const held = deferred<Response>(),
      replacementRead = deferred<void>();
    let holding = false;
    let heldRequest: WireRequest | undefined;
    const f = asymmetricFixture((r) => {
      if (!holding && quoteCall(r)) {
        holding = true;
        heldRequest = r;
        f.advance(5001);
        return held.promise;
      }
      if (holding && r.method === "eth_getBlockByNumber" && r.params[0] === "0x64") {
        replacementRead.resolve();
        return success(r, { ...f.rawBlock, hash: OTHER_HASH });
      }
      return undefined;
    });
    const { o } = await collected(f),
      before = jsonEvidence(o);
    const running = analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
    await replacementRead.promise;
    if (!heldRequest) throw new Error("missing held quote");
    held.resolve(goodPendingV2(heldRequest));
    const a = await running;
    expect(analysisEligibility(a, f.clock)).toMatchObject({ canonical: "invalidated", best: null });
    expect(a.observation.validations.some((v) => v.reason === "hash_replaced")).toBe(true);
    expect(a.observation.block).toEqual(o.block);
    expect(jsonEvidence(o)).toBe(before);
  });

  it("R07 withholds completed live-mode quotes when final validation is unavailable, then explicitly renews", async () => {
    // Constructed live-mode fault injection, never actual live evidence.
    let fail = false;
    const f = asymmetricFixture((r) =>
      fail && r.method === "eth_chainId" ? error(r, "ambiguous private-key failure") : undefined,
    );
    const { o } = await collected(f, "live"),
      before = jsonEvidence(o);
    fail = true;
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
    expect(a.rows.every((r) => r.status === "passed")).toBe(true);
    expect(analysisEligibility(a, f.clock)).toMatchObject({
      quotesComplete: true,
      qualified: true,
      canonical: "unavailable",
      workloadAdmitted: false,
      best: null,
    });
    fail = false;
    const recovered = await revalidateAnalysis(a, config, { fetch: f.fetch, clock: f.clock });
    expect(analysisEligibility(recovered, f.clock)).toMatchObject({
      canonical: "valid",
      workloadAdmitted: true,
    });
    expect(recovered.rows).toEqual(a.rows);
    expect(a.observation.validations.at(-1)?.canonical).toBe("unavailable");
    expect(jsonEvidence(o)).toBe(before);
  });

  it("R08 cancels active/undispatched quote work and ignores late replies", async () => {
    const abort = new AbortController(),
      started = deferred<void>();
    const pending: Array<{ r: WireRequest; done: (r: Response) => void }> = [];
    const f = asymmetricFixture((r) => {
      if (!quoteCall(r)) return undefined;
      return new Promise<Response>((done) => {
        pending.push({ r, done });
        if (pending.length === 3) started.resolve();
      });
    });
    const { o } = await collected(f),
      start = f.calls.length;
    const running = analyzeSnapshot(o, config, {
      fetch: f.fetch,
      clock: f.clock,
      signal: abort.signal,
    });
    await started.promise;
    abort.abort();
    const a = await running,
      before = jsonEvidence(a),
      count = f.calls.length;
    expect(a.rows).toHaveLength(36);
    expect(a.rows.every((r) => r.output === null && r.gross === null)).toBe(true);
    expect(pending).toHaveLength(3);
    expect(f.calls.slice(start).filter((r) => quoteCall(r))).toHaveLength(3);
    expect(a.quotes.every((q) => q.reason === "cancelled" && q.status === "unavailable")).toBe(
      true,
    );
    // V2 may retain a local computed diagnostic even when comparison is cancelled. V3 has no reply.
    expect(a.quotes.filter((q) => q.protocol === "v3").every((q) => q.output === null)).toBe(true);
    for (const item of pending) item.done(goodPendingV2(item.r));
    await Promise.resolve();
    expect(jsonEvidence(a)).toBe(before);
    expect(f.calls).toHaveLength(count);
    expect(analysisEligibility(a, f.clock).best).toBeNull();
    pinned(f.calls.slice(start));
  });

  it("R08 renews validation between a rate limit and the pinned retry", async () => {
    vi.useFakeTimers();
    let hits = 0;
    const f = asymmetricFixture((r) => {
      const c = quoteCall(r);
      if (c?.functionName === "getAmountsOut" && c.args?.[0] === 10_000_000n && ++hits === 1) {
        f.advance(5001);
        return new Response("private-key", { status: 429 });
      }
      return undefined;
    });
    const { o } = await collected(f),
      start = f.calls.length;
    const running = analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
    await vi.advanceTimersByTimeAsync(250);
    const a = await running,
      sent = f.calls.slice(start);
    const retries = sent
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        const c = quoteCall(r);
        return c?.functionName === "getAmountsOut" && c.args?.[0] === 10_000_000n;
      });
    expect(hits).toBe(2);
    const first = retries[0],
      second = retries[1];
    if (!first || !second) throw new Error("missing retry");
    expect(second.r.params).toEqual(first.r.params);
    expect(
      sent
        .slice(first.i + 1, second.i)
        .some((r) => r.method === "eth_getBlockByNumber" && r.params[0] === "0x64"),
    ).toBe(true);
    expect(analysisEligibility(a, f.clock).qualified).toBe(true);
    expect(a.observation.validations.length).toBeGreaterThanOrEqual(3);
    expect(a.requests.some((r) => r.outcome === "rate_limited" && r.send === 1)).toBe(true);
    expect(a.requests.some((r) => r.outcome === "success" && r.send === 2)).toBe(true);
    expect(a.requests.slice(-3).map((r) => r.method)).toEqual([
      "eth_chainId",
      "eth_getBlockByNumber",
      "eth_getBlockByNumber",
    ]);
    expect(a.logicalReads).toBeLessThanOrEqual(QUOTE_POLICY.maxReads);
    expect(a.requests.length).toBeLessThanOrEqual(QUOTE_POLICY.maxSends);
    pinned(sent);
  });

  it("R08 spends the remaining attempt budget during renewal without switching blocks", async () => {
    let renewing = false;
    const f = asymmetricFixture((r) => {
      if (!renewing && quoteCall(r)) {
        renewing = true;
        f.advance(5001);
      } else if (renewing && r.method === "eth_chainId") f.advance(POLICY.attemptTimeoutMs);
      return undefined;
    });
    const { o } = await collected(f),
      start = f.calls.length;
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch, clock: f.clock });
    expect(a.rows).toHaveLength(36);
    expect(a.observation.validations.at(-1)?.reason).toBe("deadline");
    expect(analysisEligibility(a, f.clock)).toMatchObject({
      canonical: "unavailable",
      best: null,
      workloadAdmitted: false,
    });
    expect(a.logicalReads).toBeLessThanOrEqual(QUOTE_POLICY.maxReads);
    expect(a.requests.length).toBeLessThanOrEqual(QUOTE_POLICY.maxSends);
    expect(a.observation.block).toEqual(o.block);
    pinned(f.calls.slice(start));
  });
});
