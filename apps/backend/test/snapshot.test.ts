import { describe, expect, it } from "vitest";
import { jsonEvidence, POLICY, REGISTRY } from "@pooltrace/protocols";
import {
  collectSnapshot,
  eligibility,
  prepareForUse,
  readConfig,
  revalidateSnapshot,
  type Observation,
} from "../src/index.ts";
import {
  BLOCK_HASH,
  OTHER_HASH,
  POOLS,
  error,
  fixture,
  success,
} from "../../../packages/protocols/test/fixture.ts";

const config = readConfig({ ETHEREUM_RPC_URL: "https://fixture.invalid/private-key" });
const collect = (f = fixture()) => collectSnapshot(config, { fetch: f.fetch, origin: "fixture" });

describe("registry and snapshots (V01–V18)", () => {
  it("rejects missing/invalid configuration without revealing its contents", () => {
    for (const env of [
      {},
      { ETHEREUM_RPC_URL: "secret" },
      { ETHEREUM_RPC_URL: "https://a.invalid", RPC_PROVIDER_LABEL: "https://secret" },
    ]) {
      expect(() => readConfig(env)).toThrow("configuration");
    }
  });
  it("discovers three candidates, preserves exact state, and leaves size suitability unavailable", async () => {
    const f = fixture();
    const o = await collect(f);
    expect(o.complete).toBe(true);
    expect(o.registry?.identity).toBe("passed");
    expect(o.registry?.structural).toBe("passed");
    expect(o.registry?.pools.map((p) => p.address.toLowerCase())).toEqual(POOLS);
    expect(o.registry?.pools[0]?.values.reserve0).toBe(10n ** 25n);
    expect(o.registry?.tokens.map((t) => t.observedDecimals)).toEqual([6, 18]);
    expect(JSON.parse(jsonEvidence(o)).registry.pools[0].values.reserve0).toBe(
      (10n ** 25n).toString(),
    );
    expect(o.registry?.finiteSizeSuitability).toBe("unavailable");
    expect(o.registry?.workloadAdmitted).toBe(false);
    expect(eligibility(o).eligibleForLiveQualification).toBe(false);
    expect(eligibility(o).freshness).toBe("fixture");
    expect(jsonEvidence(o)).not.toContain("private-key");
    expect(Object.isFrozen(o.registry?.pools[0]?.values)).toBe(true);
    const stateReads = f.calls.filter((c) => ["eth_call", "eth_getCode"].includes(c.method));
    expect(
      stateReads.every((c) => (c.params[1] as { requireCanonical: boolean }).requireCanonical),
    ).toBe(true);
    expect(o.registry?.pools.every((p) => p.blockHash === BLOCK_HASH)).toBe(true);
  });

  it("rejects a provider that ignores the hash selector", async () => {
    const o = await collect(fixture({ ignoreHash: true }));
    expect(o.failures).toContain("unsupported");
    expect(o.registry).toBeNull();
    expect(o.complete).toBe(false);
  });
  it("rejects wrong chain before making contract calls", async () => {
    const f = fixture({
      intercept: (r) => (r.method === "eth_chainId" ? success(r, "0xa") : undefined),
    });
    const o = await collect(f);
    expect(o.chainId).toBe(10n);
    expect(o.registry).toBeNull();
    expect(f.calls).toHaveLength(1);
  });
  it("marks a wrong post-collection chain as unavailable validation", async () => {
    let chains = 0;
    const o = await collect(
      fixture({
        intercept: (r) =>
          r.method === "eth_chainId" && ++chains > 1 ? success(r, "0xa") : undefined,
      }),
    );
    expect(o.complete).toBe(true);
    expect(eligibility(o).canonical).toBe("unavailable");
  });
  it.each([null, { number: "0x64", hash: "0x1234" }])(
    "rejects absent or malformed selected headers before state reads",
    async (value) => {
      const f = fixture({
        intercept: (r) => (r.method === "eth_getBlockByNumber" ? success(r, value) : undefined),
      });
      const o = await collect(f);
      expect(o.complete).toBe(false);
      expect(o.block).toBeNull();
      expect(f.calls).toHaveLength(2);
    },
  );
  it.each(["0x", null])(
    "distinguishes empty code from an unreadable code result",
    async (value) => {
      const o = await collect(
        fixture({
          intercept: (r) =>
            r.method === "eth_getCode" &&
            String(r.params[0]).toLowerCase() === REGISTRY.v2Factory.toLowerCase()
              ? success(r, value)
              : undefined,
        }),
      );
      expect(o.registry?.checks.find((c) => c.name === `code:${REGISTRY.v2Factory}`)?.status).toBe(
        value === "0x" ? "rejected" : "unavailable",
      );
    },
  );
  it.each(["disabled", "duplicate", "locked"])(
    "rejects %s pools without selecting replacements",
    async (scenario) => {
      const o = await collect(
        fixture({
          override: (_to, name) =>
            scenario === "disabled" && name === "feeAmountTickSpacing"
              ? 0
              : scenario === "duplicate" && name === "getPool"
                ? POOLS[0]
                : scenario === "locked" && name === "slot0"
                  ? [2n ** 96n, 0, 0, 1, 1, 0, false]
                  : undefined,
        }),
      );
      expect(scenario === "locked" ? o.registry?.structural : o.registry?.identity).toBe(
        "rejected",
      );
      expect(o.registry?.pools).toHaveLength(3);
      expect(o.registry?.workloadAdmitted).toBe(false);
    },
  );
  it("keeps unavailable factory spacing distinct from an observed mismatch", async () => {
    const o = await collect(
      fixture({
        intercept: (r) =>
          r.method === "eth_call" &&
          String((r.params[0] as { data: string }).data).startsWith("0x22afcccb")
            ? error(r, "execution reverted")
            : undefined,
      }),
    );
    expect(o.registry?.identity).toBe("unavailable");
    expect(
      o.registry?.checks
        .filter((c) => c.name.endsWith(":spacing"))
        .every((c) => c.status === "unavailable"),
    ).toBe(true);
  });
  it.each(["decimals", "token0", "token1", "factory", "fee", "tickSpacing"])(
    "rejects a %s mismatch without substituting a pool",
    async (name) => {
      const o = await collect(
        fixture({
          override: (_to, method) =>
            method !== name
              ? undefined
              : name === "decimals"
                ? 9
                : name === "token0"
                  ? REGISTRY.weth
                  : name === "factory" || name === "token1"
                    ? REGISTRY.usdc
                    : 100,
        }),
      );
      expect(o.registry?.identity).toBe("rejected");
      expect(o.registry?.pools).toHaveLength(3);
    },
  );
  it.each(["getReserves", "liquidity", "slot0"])(
    "rejects a failed %s structural screen",
    async (name) => {
      const o = await collect(
        fixture({
          override: (_to, method) =>
            method !== name
              ? undefined
              : name === "getReserves"
                ? [0n, 1n, 1]
                : name === "liquidity"
                  ? 0n
                  : [0n, 0, 0, 1, 1, 0, true],
        }),
      );
      expect(o.registry?.structural).toBe("rejected");
      expect(o.registry?.identity).toBe("passed");
    },
  );
  it("keeps authoritative missing pools and unavailable reads distinct", async () => {
    const absent = await collect(
      fixture({
        override: (_to, method) =>
          method === "getPair" ? "0x0000000000000000000000000000000000000000" : undefined,
      }),
    );
    expect(absent.registry?.checks.find((c) => c.name === "discover:v2")?.status).toBe("rejected");
    const partial = await collect(
      fixture({
        intercept: (r) => {
          if (
            r.method === "eth_call" &&
            String((r.params[0] as { data: string }).data).startsWith("0x0dfe1681")
          )
            return error(r, "execution reverted secret");
          return undefined;
        },
      }),
    );
    expect(partial.complete).toBe(false);
    expect(partial.registry?.identity).toBe("unavailable");
    expect(jsonEvidence(partial)).not.toContain("secret");
  });
  it("invalidates a replaced block and never resurrects its record", async () => {
    const f = fixture({
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
    const o = await collect(f);
    expect(eligibility(o).canonical).toBe("invalidated");
    const normal = fixture();
    expect(await revalidateSnapshot(o, config, { fetch: normal.fetch })).toBe(o);
    expect(normal.calls).toHaveLength(0);
  });
  it("distinguishes ambiguous validation failures, then retains successful recovery events", async () => {
    const o = await collect();
    const failed = await revalidateSnapshot(o, config, {
      fetch: fixture({ intercept: (r) => error(r, "ambiguous failure") }).fetch,
    });
    expect(eligibility(failed).canonical).toBe("unavailable");
    const recovered = await revalidateSnapshot(failed, config, { fetch: fixture().fetch });
    expect(eligibility(recovered).canonical).toBe("valid");
    expect(recovered.validations).toHaveLength(3);
    expect(o.validations).toHaveLength(1);
  });
  it.each(["missing", "contradictory", "noncanonical"])(
    "handles %s canonical validation without promoting the payload",
    async (scenario) => {
      const f = fixture({
        intercept: (r) => {
          if (r.method !== "eth_getBlockByNumber" || r.params[0] !== "0x64") return undefined;
          if (scenario === "noncanonical") return error(r, "block is not canonical");
          return success(r, scenario === "missing" ? null : { ...f.rawBlock, timestamp: "0x1" });
        },
      });
      const o = await collect(f);
      expect(o.complete).toBe(true);
      expect(eligibility(o).canonical).toBe(
        scenario === "noncanonical" ? "invalidated" : "unavailable",
      );
      expect(eligibility(o).eligibleForLiveQualification).toBe(false);
    },
  );
  it("makes new post-validation requests even when the latest block has not changed", async () => {
    const f = fixture();
    const o = await collect(f);
    expect(f.calls.filter((r) => r.method === "eth_chainId")).toHaveLength(2);
    expect(f.calls.filter((r) => r.method === "eth_getBlockByNumber")).toHaveLength(3);
    const offset = POLICY.maxValidationAgeMs + 1;
    const clock = {
      wall: () => o.finishedAt + offset,
      mono: () => o.startedMono + o.elapsedMs + offset,
    };
    const refreshed = await prepareForUse(o, config, { fetch: f.fetch, clock });
    expect(refreshed.observation.validations).toHaveLength(2);
    expect(f.calls.filter((r) => r.method === "eth_chainId")).toHaveLength(3);
  });
  it("keeps explicit historical origin separate and never uses an unpinned read", async () => {
    const f = fixture();
    const o = await collectSnapshot(config, { fetch: f.fetch, blockNumber: 100n });
    expect(o.origin).toBe("historical");
    expect(eligibility(o).freshness).toBe("historical");
    expect(eligibility(o).eligibleForLiveQualification).toBe(false);
    await expect(
      collectSnapshot(config, { fetch: f.fetch, blockNumber: 100n, origin: "live" }),
    ).rejects.toMatchObject({ reason: "configuration" });
  });
  it("retains the selected hash as the latest head advances and keeps attempts separate", async () => {
    const f = fixture({
      intercept: (r) =>
        r.method === "eth_getBlockByNumber" && r.id > 2 && r.params[0] === "latest"
          ? success(r, {
              number: "0x65",
              hash: OTHER_HASH,
              parentHash: BLOCK_HASH,
              timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
            })
          : undefined,
    });
    const first = await collect(f);
    const second = await collect();
    expect(eligibility(first).headLag).toBe("1");
    expect(first.attemptId).not.toBe(second.attemptId);
    expect(first.registry).not.toBe(second.registry);
    const probes = new Set(first.capabilities.map((c) => c.unknownHashTestInput));
    for (const r of f.calls.filter((r) => ["eth_call", "eth_getCode"].includes(r.method))) {
      const hash = (r.params[1] as { blockHash: typeof BLOCK_HASH }).blockHash;
      expect(hash === BLOCK_HASH || probes.has(hash)).toBe(true);
    }
    await expect(
      revalidateSnapshot(
        first,
        { ...config, configurationRevision: "changed" },
        { fetch: f.fetch },
      ),
    ).rejects.toMatchObject({ reason: "configuration" });
  });
  it("retains rollback detected during revalidation even after the clock recovers", async () => {
    const o = await collect();
    let offset = 0;
    let reads = 0;
    const f = fixture({
      intercept: () => {
        offset = ++reads === 2 ? -5 : 0;
        return undefined;
      },
    });
    const clock = {
      wall: () => o.finishedAt + 20 + offset,
      mono: () => o.startedMono + o.elapsedMs + 20,
    };
    const revalidated = await revalidateSnapshot(o, config, { fetch: f.fetch, clock });
    expect(revalidated.clockInvalid).toBe(true);
    expect(eligibility(revalidated, clock).freshness).toBe("unavailable");
  });

  it("enforces inclusive age/lag/validation/future boundaries and detects clock rollback", async () => {
    const original = await collect();
    const block = original.block;
    const validation = original.validations[0];
    if (!block || !validation) throw new Error("missing fixture");
    const selectedBlock = block;
    const selectedValidation = validation;
    const base = Number(block.timestamp * 1000n);
    function at(age: number, validationAge = 0, lag = 2n) {
      const now = base + age;
      const o: Observation = {
        ...original,
        origin: "live",
        startedAt: base - 10_000,
        startedMono: 0,
        clockInvalid: false,
        validations: [
          {
            ...selectedValidation,
            at: now - validationAge,
            monotonicAt: 10_000 + age - validationAge,
            head: { ...selectedBlock, number: selectedBlock.number + lag },
          },
        ],
      };
      return eligibility(o, { wall: () => now, mono: () => 10_000 + age });
    }
    expect(at(30_000, 5_000).eligibleForLiveQualification).toBe(true);
    expect(at(30_001).freshness).toBe("stale");
    expect(at(0, 5_001).validationExpired).toBe(true);
    expect(at(0, 0, 3n).freshness).toBe("stale");
    expect(at(0, 0, -1n).freshness).toBe("unavailable");
    expect(at(-2_000).freshness).toBe("fresh");
    expect(at(-2_001).freshness).toBe("unavailable");
    expect(
      eligibility(original, {
        wall: () => original.startedAt - 1,
        mono: () => original.startedMono + 1,
      }).freshness,
    ).toBe("unavailable");
  });
});
