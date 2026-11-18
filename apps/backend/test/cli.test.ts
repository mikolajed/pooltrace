import { describe, it, expect, vi } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runCli, loadCliEnvironment, formatAmount, renderCli } from "../src/cli-runner.ts";
import { collectSnapshot } from "../src/snapshot.ts";
import { analyzeSnapshot } from "../src/analysis.ts";
import { readConfig } from "../src/config.ts";
import { quoteFixture } from "@pooltrace/protocols/fixtures";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const defaultGrid = '["10","50","100","500","1000","5000"]';
const emptyFile = () => undefined;
function dependencies(kind?: NonNullable<Parameters<typeof quoteFixture>[0]>["kind"]) {
  return {
    root,
    env: { ETHEREUM_RPC_URL: "invalid-private-key", USDC_INPUT_AMOUNTS: defaultGrid },
    readFile: emptyFile,
    fixtureFactory: () => quoteFixture({ timestamp: 1_700_000_000n, ...(kind ? { kind } : {}) }),
  };
}
function semantic(rows: NonNullable<Awaited<ReturnType<typeof runCli>>["envelope"]>["analysis"]) {
  return rows?.rows.map(({ route, input, output, gross, status, reason }) => ({
    route,
    input,
    output,
    gross,
    status,
    reason,
  }));
}
describe("CLI contract and shared behavior (C01–C07)", () => {
  it("shows text/JSON help without reading configuration or calling transport", async () => {
    const readFile = vi.fn(() => {
        throw new Error("private-key");
      }),
      fetch = vi.fn(async () => {
        throw new Error("private-key");
      });
    const a = await runCli(["--help"], {
      root,
      env: { USDC_INPUT_AMOUNTS: "bad" },
      readFile,
      fetch,
    });
    const b = await runCli(["--format", "json", "--help"], { root, env: {}, readFile, fetch });
    expect(a.exitCode).toBe(0);
    expect(a.stdout).toContain("Usage: bun run cli");
    expect(JSON.parse(b.stdout)).toMatchObject({ formatVersion: "cli-v1", kind: "help" });
    expect(readFile).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [],
    ["--mode", "unknown"],
    ["--mode", "fixture", "--mode", "live"],
    ["--help", "--mode", "live"],
    ["--help", "--sizes", "[]"],
    ["--mode", "fixture", "--unknown", "private-key"],
    ["--mode", "fixture", "positional"],
    ["--mode", "fixture", "--format", "bad"],
  ])("rejects bad usage without exposing arguments", async (...args) => {
    const argv = args.filter((x): x is string => typeof x === "string");
    const result = await runCli([...argv, "--format=json"], dependencies());
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout).status).toBe("configuration_error");
    expect(result.stdout).not.toContain("private-key");
  });
  it("loads root files in order, then defined process overrides", () => {
    const env = loadCliEnvironment(
      root,
      { RPC_PROVIDER_LABEL: "process", ETHEREUM_RPC_URL: undefined },
      (p) =>
        p.endsWith(".env.local")
          ? "RPC_PROVIDER_LABEL=local\nETHEREUM_RPC_URL=https://local.invalid"
          : "RPC_PROVIDER_LABEL=file\nETHEREUM_RPC_URL=https://file.invalid",
    );
    expect(env.RPC_PROVIDER_LABEL).toBe("process");
    expect(env.ETHEREUM_RPC_URL).toBe("https://local.invalid");
    expect(() =>
      loadCliEnvironment(root, {}, () => {
        throw new Error("private-key");
      }),
    ).toThrow("environment");
  });
  it("validates size precedence before network and lets explicit arguments override invalid environment", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("no network");
    });
    const good = await runCli(["--mode", "fixture", "--format", "json", "--sizes", defaultGrid], {
      ...dependencies(),
      env: { USDC_INPUT_AMOUNTS: "bad" },
      fetch,
    });
    expect(good.exitCode).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    for (const raw of ["[1,2,3,4,5,6]", '["1"]', '["1","1.0","2","3","4","5"]', "private-key"]) {
      const bad = await runCli(["--mode", "live", "--format", "json", "--sizes", raw], {
        ...dependencies(),
        env: { ETHEREUM_RPC_URL: "https://fixture.invalid/private-key" },
        fetch,
      });
      expect(bad.exitCode).toBe(2);
      expect(bad.stdout).not.toContain("private-key");
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("runs fixture mode without valid live credentials and matches the same backend data", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("live transport forbidden");
    });
    const result = await runCli(["--mode", "fixture", "--format", "json"], {
      ...dependencies(),
      fetch,
    });
    expect(result.exitCode).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    const decoded = JSON.parse(result.stdout);
    expect(decoded).toMatchObject({
      formatVersion: "cli-v1",
      mode: "fixture",
      origin: "fixture",
      constructed: true,
      status: "usable",
    });
    expect(decoded.analysis.rows).toHaveLength(36);
    expect(decoded.eligibility.workloadAdmitted).toBe(false);
    expect(decoded.eligibility.best.gross).toMatch(/^-\d+$/);
    expect(decoded.eligibility.transactionCost.status).toBe("unavailable");
    const f = quoteFixture({ timestamp: 1_700_000_000n });
    const config = readConfig({
      ETHEREUM_RPC_URL: "https://fixture.invalid",
      RPC_PROVIDER_LABEL: "constructed-fixture",
      RPC_CONFIG_REVISION: "diagnostic-fixture-v1",
    });
    const observation = await collectSnapshot(config, { fetch: f.fetch, origin: "fixture" });
    const direct = await analyzeSnapshot(observation, config, { fetch: f.fetch });
    expect(semantic(result.envelope?.analysis ?? null)).toEqual(semantic(direct));
    expect(result.stdout).not.toContain("invalid-private-key");
    expect(result.stdout).not.toContain("\u001b");
  });
  it("formats exact small/signed/large amounts and all text rows with provenance and honest gross states", async () => {
    expect(formatAmount(-14094n, 6)).toBe("-0.014094");
    expect(formatAmount(1n, 18)).toBe("0.000000000000000001");
    expect(formatAmount(10n ** 40n + 1n, 6)).toBe(`${10n ** 34n}.000001`);
    const result = await runCli(["--mode", "fixture"], dependencies());
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("CONSTRUCTED FIXTURE");
    expect(result.stdout).toContain("No positive gross result");
    const e = result.envelope;
    if (!e?.eligibility?.best) throw new Error("missing constructed ranking");
    const zero = renderCli(
      { ...e, eligibility: { ...e.eligibility, best: { ...e.eligibility.best, gross: 0n } } },
      "text",
    );
    expect(zero).toContain("Best tested gross: 0 USDC");
    expect(zero).toContain("No positive gross result");
    expect(result.stdout).toContain("Estimated net profit: unavailable");
    expect(result.stdout).toContain("Current live admission: false");
    expect(result.stdout).toContain("Hash: 0xaaaa");
    expect(result.stdout.split("\n").filter((x) => /^V[23].* \| /.test(x))).toHaveLength(36);
    const positive = await runCli(["--mode", "fixture"], dependencies("gross_positive"));
    expect(positive.exitCode).toBe(0);
    expect(positive.stdout).toContain("Positive gross quotation only");
    expect(positive.envelope?.eligibility?.best?.gross).toBeGreaterThan(0n);
  });
  it.each(["partial", "impact", "wrong_factory", "opposite"] as const)(
    "reports %s as unusable with preserved outcomes",
    async (kind) => {
      const result = await runCli(["--mode", "fixture", "--format", "json"], dependencies(kind));
      expect(result.exitCode).toBe(1);
      expect(result.envelope?.analysis?.rows).toHaveLength(36);
      expect(result.envelope?.eligibility?.best).toBeNull();
      expect(result.envelope?.status).toBe(kind === "opposite" ? "incomplete" : "rejected");
    },
  );
  it("reports stale data and invalidation without a best result", async () => {
    const f = quoteFixture({ timestamp: BigInt(Math.floor(Date.now() / 1000) - 60) });
    const stale = await runCli(["--mode", "live", "--format", "json"], {
      ...dependencies(),
      env: { ETHEREUM_RPC_URL: "https://fixture.invalid" },
      fetch: f.fetch,
    });
    expect(stale.exitCode).toBe(1);
    expect(stale.envelope?.status).toBe("stale");
    const original = await runCli(["--mode", "fixture", "--format", "json"], dependencies());
    const e = original.envelope;
    if (!e?.analysis || !e.eligibility) throw new Error("missing constructed analysis");
    const invalid = {
      ...e,
      eligibility: { ...e.eligibility, canonical: "invalidated" as const, best: null },
      status: "invalidated" as const,
    };
    const text = renderCli(invalid, "text");
    expect(text).toContain("Best tested gross: unavailable");
    expect(text).not.toContain("No positive gross result");
  });
  it("returns safe configuration/runtime failures and forwards cancellation to the shared transport", async () => {
    const missing = await runCli(["--mode", "live", "--format", "json"], {
      root,
      env: {},
      readFile: emptyFile,
    });
    expect(missing.exitCode).toBe(2);
    expect(missing.envelope?.reason).toBe("configuration");
    const failed = await runCli(["--mode", "live", "--format", "json"], {
      root,
      env: { ETHEREUM_RPC_URL: "https://fixture.invalid/private-key" },
      readFile: emptyFile,
      fetch: async () => {
        throw new Error("https://fixture.invalid/private-key");
      },
    });
    expect(failed.exitCode).toBe(1);
    expect(failed.stdout).not.toContain("private-key");
    const abort = new AbortController();
    const fetch = vi.fn(async () => {
      abort.abort();
      return new Promise<Response>(() => {});
    });
    const cancelled = await runCli(["--mode", "live", "--format", "json"], {
      root,
      env: { ETHEREUM_RPC_URL: "https://fixture.invalid" },
      readFile: emptyFile,
      signal: abort.signal,
      fetch,
    });
    expect(cancelled.exitCode).toBe(130);
    expect(cancelled.envelope?.status).toBe("cancelled");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("executes the actual root help/fixture/JSON/configuration commands", () => {
    for (const args of [
      ["--help"],
      ["--mode", "fixture"],
      ["--mode", "fixture", "--format", "json"],
      ["--mode", "live", "--format", "json"],
    ]) {
      const p = spawnSync("bun", ["run", "cli", ...args], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, ETHEREUM_RPC_URL: "", USDC_INPUT_AMOUNTS: defaultGrid },
      });
      expect(p.status).toBe(args.includes("live") ? 2 : 0);
      if (args.includes("json")) {
        const result = JSON.parse(p.stdout);
        expect(result.formatVersion).toBe("cli-v1");
      } else expect(p.stdout).toContain(args.includes("--help") ? "Usage:" : "CONSTRUCTED FIXTURE");
    }
  });
  it("handles native SIGINT through the actual Bun/Node root command and exits after owned cleanup", async () => {
    const bootstrap = new URL("./cli-signal-bootstrap.ts", import.meta.url).href;
    const result = await new Promise<{ code: number | null; out: string; err: string }>(
      (resolve, reject) => {
        const child = spawn("bun", ["run", "cli", "--mode", "live", "--format", "json"], {
          cwd: root,
          detached: true,
          env: {
            ...process.env,
            ETHEREUM_RPC_URL: "https://fixture.invalid",
            USDC_INPUT_AMOUNTS: defaultGrid,
            NODE_OPTIONS: `--import=${bootstrap}`,
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let out = "",
          err = "",
          sent = false;
        const timer = setTimeout(() => {
          if (child.pid) {
            try {
              process.kill(-child.pid, "SIGKILL");
            } catch {}
          }
          reject(new Error("owned CLI interruption timed out"));
        }, 5000);
        child.stdout.on("data", (data) => {
          out += String(data);
        });
        child.stderr.on("data", (data) => {
          err += String(data);
          if (!sent && err.includes("CLI_TEST_FETCH_STARTED")) {
            sent = true;
            child.kill("SIGINT");
          }
        });
        child.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once("close", (code) => {
          clearTimeout(timer);
          resolve({ code, out, err });
        });
      },
    );
    expect(result.code).toBe(130);
    expect(JSON.parse(result.out)).toMatchObject({ formatVersion: "cli-v1", status: "cancelled" });
  });
});
