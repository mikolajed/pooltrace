import { describe, it, expect } from "vitest";
import { QUOTE_POLICY } from "@pooltrace/domain";
import { QUOTE_SOURCE, POLICY, jsonEvidence } from "@pooltrace/protocols";
import {
  analyzeSnapshot,
  analysisEligibility,
  collectSnapshot,
  readConfig,
  prepareAnalysisForUse,
  revalidateAnalysis,
} from "../src/index.ts";
import { quoteFixture } from "../../../packages/protocols/test/quote-fixture.ts";
import {
  BLOCK_HASH,
  OTHER_HASH,
  success,
  error,
} from "../../../packages/protocols/test/fixture.ts";
const config = readConfig({ ETHEREUM_RPC_URL: "https://fixture.invalid/private-key" });
async function collected(f = quoteFixture()) {
  return { f, o: await collectSnapshot(config, { fetch: f.fetch, origin: "fixture" }) };
}
describe("quotation orchestration and lifecycle (Q03–Q18)", () => {
  it("shares periodic validation with state sends without exceeding four requests or deadlocking", async () => {
    const base = quoteFixture();
    const o = await collectSnapshot(config, { fetch: base.fetch, origin: "fixture" });
    let offset = 0,
      advanced = false,
      active = 0,
      peak = 0;
    const f = quoteFixture({
      intercept: (r) => {
        if (
          !advanced &&
          r.method === "eth_call" &&
          String((r.params[0] as { to: string }).to).toLowerCase() ===
            QUOTE_SOURCE.quoter.toLowerCase() &&
          String((r.params[0] as { data: string }).data).startsWith("0xc6a5026a")
        ) {
          advanced = true;
          offset = 5001;
        }
        return undefined;
      },
    });
    const clock = {
      wall: () => o.finishedAt + offset,
      mono: () => o.startedMono + o.elapsedMs + offset,
    };
    const fetcher: typeof f.fetch = async (url, init) => {
      active++;
      peak = Math.max(peak, active);
      try {
        return await f.fetch(url, init);
      } finally {
        active--;
      }
    };
    const a = await analyzeSnapshot(o, config, { fetch: fetcher, clock });
    expect(analysisEligibility(a, clock).qualified).toBe(true);
    expect(a.observation.validations.length).toBeGreaterThanOrEqual(o.validations.length + 2);
    expect(peak).toBeLessThanOrEqual(4);
    expect(a.logicalReads).toBeLessThanOrEqual(100);
  });
  it("includes clock elapsed work in the quote deadline and retains all terminal outcomes", async () => {
    const { o } = await collected();
    let offset = 0;
    const f = quoteFixture({
      intercept: (r) => {
        if (
          r.method === "eth_call" &&
          String((r.params[0] as { to: string }).to).toLowerCase() ===
            QUOTE_SOURCE.quoter.toLowerCase() &&
          String((r.params[0] as { data: string }).data).startsWith("0xc6a5026a")
        )
          offset = 20_001;
        return undefined;
      },
    });
    const clock = {
      wall: () => o.finishedAt + offset,
      mono: () => o.startedMono + o.elapsedMs + offset,
    };
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch, clock });
    expect(a.rows).toHaveLength(36);
    expect(analysisEligibility(a, clock).qualified).toBe(false);
    expect(a.observation.validations.at(-1)?.reason).toBe("deadline");
    expect(a.requests.length).toBeLessThan(100);
  });
  it("qualifies all 36 exact composed entries, preserves source state, and uses bounded pinned calls", async () => {
    const { f, o } = await collected();
    const before = jsonEvidence(o);
    const count = f.calls.length;
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch });
    const state = analysisEligibility(a);
    expect(state.qualified).toBe(true);
    expect(state.quotesComplete).toBe(true);
    expect(state.best?.gross).toBeLessThan(0n);
    expect(state.workloadAdmitted).toBe(false);
    expect(state.freshness).toBe("fixture");
    expect(a.rows).toHaveLength(36);
    expect(new Set(a.rows.map((r) => r.leg1)).size).toBe(18);
    const lookup = new Map(a.quotes.map((q) => [q.quoteId, q]));
    for (const row of a.rows) {
      expect(lookup.get(row.leg2 ?? "")?.input).toBe(lookup.get(row.leg1 ?? "")?.output);
      expect(row.gross).toBe((row.output ?? 0n) - row.input);
    }
    for (const r of f.calls
      .slice(count)
      .filter((r) => ["eth_call", "eth_getCode"].includes(r.method))) {
      expect(r.params[1]).toEqual({ blockHash: BLOCK_HASH, requireCanonical: true });
      if (r.method === "eth_call")
        expect((r.params[0] as { gas: string }).gas).toBe(`0x${QUOTE_POLICY.callGas.toString(16)}`);
    }
    expect(a.logicalReads).toBeLessThanOrEqual(100);
    expect(a.requests.length).toBeLessThanOrEqual(200);
    expect(jsonEvidence(o)).toBe(before);
    expect(o.registry?.finiteSizeSuitability).toBe("unavailable");
    expect(Object.isFrozen(a.quotes[0]?.evidence)).toBe(true);
    expect(a.transactionCost.status).toBe("unavailable");
    expect(a.netProfit.status).toBe("unavailable");
    expect(jsonEvidence(a)).not.toContain("private-key");
  });
  it.each(["partial", "opposite", "impact", "zero", "comparison", "wrong_factory"] as const)(
    "keeps %s failures explicit without reducing the workload",
    async (kind) => {
      const { f, o } = await collected(quoteFixture({ kind }));
      const a = await analyzeSnapshot(o, config, { fetch: f.fetch });
      expect(a.rows).toHaveLength(36);
      expect(analysisEligibility(a).qualified).toBe(false);
      expect(analysisEligibility(a).best).toBeNull();
      if (kind === "partial")
        expect(a.quotes.some((q) => q.reason === "full_input_not_proven")).toBe(true);
      if (kind === "opposite")
        expect(
          a.quotes.some((q) => q.status === "unavailable" && q.reason === "inconsistent_price"),
        ).toBe(true);
      if (kind === "comparison")
        expect(a.quotes.some((q) => q.reason === "protocol_mismatch")).toBe(true);
      expect(a.rows.some((r) => r.leg2 === null)).toBe(true);
    },
  );
  it("keeps terminal quoter failures unavailable, without inventing zero outputs", async () => {
    let fail = false;
    const f = quoteFixture({
      intercept: (r) =>
        fail &&
        r.method === "eth_call" &&
        String((r.params[0] as { to: string }).to).toLowerCase() ===
          QUOTE_SOURCE.quoter.toLowerCase() &&
        String((r.params[0] as { data: string }).data).startsWith("0xc6a5026a")
          ? error(r, "execution reverted private-key")
          : undefined,
    });
    const { o } = await collected(f);
    fail = true;
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch });
    expect(a.quotes.some((q) => q.status === "unavailable" && q.output === null)).toBe(true);
    expect(analysisEligibility(a).qualified).toBe(false);
    expect(jsonEvidence(a)).not.toContain("private-key");
  });
  it("rejects bad grids and changed configuration before any new provider access", async () => {
    const { f, o } = await collected();
    const count = f.calls.length;
    await expect(analyzeSnapshot(o, config, { sizes: ["1"], fetch: f.fetch })).rejects.toThrow(
      "size_configuration",
    );
    await expect(
      analyzeSnapshot(o, { ...config, configurationRevision: "changed" }, { fetch: f.fetch }),
    ).rejects.toThrow("configuration");
    expect(f.calls).toHaveLength(count);
  });
  it("never resurrects a confirmed replaced block", async () => {
    const { f, o } = await collected();
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch });
    const replaced = quoteFixture({
      intercept: (r) =>
        r.method === "eth_getBlockByNumber" && r.params[0] === "0x64"
          ? success(r, {
              number: "0x64",
              hash: OTHER_HASH,
              parentHash: BLOCK_HASH,
              timestamp: "0x1",
            })
          : undefined,
    });
    const invalid = await revalidateAnalysis(a, config, { fetch: replaced.fetch });
    expect(analysisEligibility(invalid).canonical).toBe("invalidated");
    expect(analysisEligibility(invalid).best).toBeNull();
    const count = f.calls.length;
    const again = await revalidateAnalysis(invalid, config, { fetch: f.fetch });
    expect(again).toBe(invalid);
    expect(f.calls).toHaveLength(count);
  });
  it("renews expired validation with new requests and preserves unavailable/recovery events", async () => {
    const { f, o } = await collected();
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch });
    const offset = POLICY.maxValidationAgeMs + 1;
    const clock = {
      wall: () => a.finishedAt + offset,
      mono: () => o.startedMono + (a.finishedAt - o.startedAt) + offset,
    };
    const prepared = await prepareAnalysisForUse(a, config, { fetch: f.fetch, clock });
    expect(prepared.eligibility.validationExpired).toBe(false);
    expect(prepared.analysis.observation.validations.length).toBe(
      a.observation.validations.length + 1,
    );
    const failed = await revalidateAnalysis(prepared.analysis, config, {
      fetch: quoteFixture({ intercept: (r) => error(r, "ambiguous failure") }).fetch,
      clock,
    });
    expect(analysisEligibility(failed, clock).canonical).toBe("unavailable");
    const recovered = await revalidateAnalysis(failed, config, { fetch: f.fetch, clock });
    expect(analysisEligibility(recovered, clock).canonical).toBe("valid");
  });
  it("retains historical origin and never mixes attempts/reuse across runs", async () => {
    const f = quoteFixture();
    const o = await collectSnapshot(config, { fetch: f.fetch, blockNumber: 100n });
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch }),
      b = await analyzeSnapshot(o, config, { fetch: f.fetch });
    expect(analysisEligibility(a).freshness).toBe("historical");
    expect(analysisEligibility(a).workloadAdmitted).toBe(false);
    expect(a.attemptId).not.toBe(b.attemptId);
    expect(a.quotes[0]?.quoteId).not.toBe(b.quotes[0]?.quoteId);
    expect(
      a.quotes.every((q) => q.analysisId === a.attemptId && q.observationId === o.attemptId),
    ).toBe(true);
  });
  it("keeps all outcomes unavailable after pre-aborted cancellation", async () => {
    const { f, o } = await collected();
    const abort = new AbortController();
    abort.abort();
    const a = await analyzeSnapshot(o, config, { fetch: f.fetch, signal: abort.signal });
    expect(analysisEligibility(a).qualified).toBe(false);
    expect(a.rows).toHaveLength(36);
    expect(a.quotes).toHaveLength(0);
  });
  it("rejects expired live source age instead of restarting at another block", async () => {
    const { f, o } = await collected();
    const old = {
      ...o,
      origin: "live" as const,
      block: o.block ? { ...o.block, timestamp: BigInt(Math.floor(Date.now() / 1000) - 60) } : null,
    };
    const a = await analyzeSnapshot(old, config, { fetch: f.fetch });
    expect(a.quotes).toHaveLength(0);
    expect(a.failures).toContain("stale");
  });
});
