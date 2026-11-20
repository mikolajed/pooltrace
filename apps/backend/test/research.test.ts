import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Fetch, type Header, RpcSession } from "@pooltrace/protocols";
import { quoteFixture, success, BLOCK_HASH } from "@pooltrace/protocols/fixtures";
import type { CycleRow } from "../src/analysis.ts";
import { digest } from "../src/storage/codec.ts";
import { buildReport, amountStats, type Sample, summarizeWindow } from "../src/research/report.ts";
import { type Attempt, type Event, Journal, readJournal, SETTINGS } from "../src/research/model.ts";
import { runExperiment } from "../src/research/runner.ts";
import { RunTransport } from "../src/research/transport.ts";
import { acquireProducer } from "../src/producer-guard.ts";
import { continuationPlan } from "../src/research/continuation.ts";
import { sourceIdentity, hashBytes, SIZES, type Manifest } from "../src/research/model.ts";

const roots: string[] = [];
function temporary() {
  const root = mkdtempSync(join(tmpdir(), "pooltrace-arb-01-"));
  roots.push(root);
  return root;
}
afterEach(() => {
  vi.useRealTimers();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const clock = { wall: () => Date.now(), mono: () => performance.now() };
const hash = (number: bigint) => `0x${number.toString(16).padStart(64, "0")}` as Header["hash"];
const header = (number: bigint): Header => ({
  number,
  hash: hash(number),
  parentHash: hash(number - 1n),
  timestamp: 1_700_000_000n,
});
const start = { wall: 1_700_000_000_000, mono: 100 };
const completed = { wall: start.wall + 5, mono: start.mono + 5 };
const windowEvent = {
  kind: "window",
  window: 1,
  armed: start,
  head: header(98n),
  start: 100n,
  end: 103n,
} as const;
const state = {
  canonical: "valid",
  freshness: "fresh",
  blockAgeMs: 5,
  headLag: "0",
  validationExpired: false,
  qualified: true,
  quotesComplete: true,
  workloadAdmitted: true,
} as NonNullable<Attempt["state"]>;
function sample(index: number, number: bigint, gross: bigint, admitted = true): Sample {
  const event: Attempt = {
    kind: "attempt",
    window: 1,
    index,
    started: start,
    completed,
    observationRevision: null,
    analysisRevision: null,
    status: admitted ? "usable" : "stale",
    reason: null,
    persistence: "saved",
    state: admitted ? state : { ...state, freshness: "stale", workloadAdmitted: false },
  };
  const rows: CycleRow[] = [
    {
      route: [0, 1],
      input: 10_000_000n,
      leg1: "a",
      leg2: "b",
      status: "passed",
      reason: null,
      output: 10_000_000n + gross,
      gross,
    },
  ];
  return {
    event,
    block: header(number),
    admitted,
    invalidated: false,
    rows,
    quoteMs: 3,
    collectionMs: 1,
    clockInvalid: false,
  };
}
const canonical = [100n, 101n, 102n, 103n].map(
  (height) =>
    ({
      kind: "canonical",
      window: 1,
      at: completed,
      height,
      header: header(height),
      reason: null,
    }) as const,
);
describe("ARB-01 unique block accounting and exact evidence", () => {
  it("keeps the first failed sample and never improves yield with a positive duplicate", () => {
    const samples = [
      sample(0, 100n, -10n),
      sample(1, 100n, 999n),
      sample(2, 101n, 10n, false),
      sample(3, 101n, 100n),
    ];
    const heads = [100n, 101n, 102n].map(
      (number) =>
        ({ kind: "head", window: 1, at: start, header: header(number), reason: null }) as const,
    );
    const result = summarizeWindow(
      windowEvent,
      { ...SETTINGS, blocks: 4 },
      samples,
      heads,
      canonical,
    );
    expect(result.coverage).toEqual({
      qualified: 1,
      attemptedIneligible: 1,
      seenNotAttempted: 1,
      notSeenNotAttempted: 1,
      canonicalUnknown: 0,
    });
    expect(result.duplicates).toBe(2);
    expect(result.positiveGrossRate).toEqual({ numerator: 0, denominator: 1 });
    expect(result.grossUsdcBase.max).toBe(-10n);
    expect(result.ineligible).toEqual({ stale: 1 });
  });
  it("reports unavailable yield when no block qualifies, and unknown canonical state separately", () => {
    const result = summarizeWindow(
      windowEvent,
      { ...SETTINGS, blocks: 4 },
      [sample(0, 100n, 5n, false)],
      [],
      canonical.slice(0, 1),
    );
    expect(result.positiveGrossRate).toBeNull();
    expect(result.coverage.canonicalUnknown).toBe(3);
    expect(result.grossUsdcBase.count).toBe(0);
  });
  it("excludes orphaned hashes and incoherent closing chains", () => {
    const orphan = sample(0, 100n, 100n);
    orphan.block = { ...header(100n), hash: hash(999n) };
    const result = summarizeWindow(
      windowEvent,
      { ...SETTINGS, blocks: 4 },
      [orphan],
      [],
      canonical,
    );
    expect(result.orphanedAttempts).toBe(1);
    expect(result.coverage.qualified).toBe(0);
    const closing = canonical.map((c) =>
      c.height === 101n ? { ...c, header: { ...c.header, parentHash: hash(555n) } } : c,
    );
    expect(
      summarizeWindow(windowEvent, { ...SETTINGS, blocks: 4 }, [], [], closing).coverage
        .canonicalUnknown,
    ).toBe(2);
  });
  it("rejects invalid clocks and does not clamp a late observer receipt into zero latency", () => {
    const late = {
      kind: "head",
      window: 1,
      at: { wall: completed.wall + 10, mono: completed.mono + 10 },
      header: header(100n),
      reason: null,
    } as const;
    const result = summarizeWindow(
      windowEvent,
      { ...SETTINGS, blocks: 4 },
      [sample(0, 100n, 1n)],
      [late],
      canonical,
    );
    expect(result.timing.firstSeenToCompletionMs.count).toBe(0);
    expect(result.firstSeenUnavailable).toBe(1);
    const invalid = sample(1, 101n, 2n);
    invalid.clockInvalid = true;
    expect(
      summarizeWindow(windowEvent, { ...SETTINGS, blocks: 4 }, [invalid], [], canonical).coverage
        .qualified,
    ).toBe(0);
  });
  it("preserves large signed amounts and declares nearest-rank quantiles", () => {
    const huge = 2n ** 100n;
    expect(amountStats([-huge, 0n, huge])).toEqual({
      count: 3,
      min: -huge,
      p50: 0n,
      p95: huge,
      max: huge,
      positive: 1,
      zero: 1,
      negative: 1,
    });
  });
  it("detects modified and truncated journal entries", () => {
    const path = join(temporary(), "journal.jsonl");
    const journal = new Journal(path);
    journal.append(
      { kind: "end", at: completed, reason: "cancelled", windows: 0, cleanup: true },
      true,
    );
    journal.close();
    const bytes = readFileSync(path, "utf8");
    expect(readJournal(path).events).toHaveLength(1);
    writeFileSync(path, bytes.replace("cancelled", "complete"));
    expect(() => readJournal(path)).toThrow("journal_corrupt");
    writeFileSync(path, bytes.slice(0, -1));
    expect(() => readJournal(path)).toThrow("journal_incomplete");
  });
});

describe("ARB-01 shared transport budgets and cancellation", () => {
  it("shares four slots, holds them through body reads and dispatches pipeline work before queued observation", async () => {
    const events: Event[] = [];
    const finish: (() => void)[] = [];
    const underlying: Fetch = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              finish.push(() => {
                controller.enqueue(new TextEncoder().encode("{}"));
                controller.close();
              });
            },
          }),
        ),
    );
    const transport = new RunTransport(
      1,
      20,
      2,
      clock.mono() + 10_000,
      clock,
      (e) => events.push(e),
      underlying,
    );
    const request = (category: "quotes" | "observer") =>
      transport.fetchFor(() => category)("https://fixture.invalid", {
        body: '{"method":"eth_call"}',
      });
    const first = Array.from({ length: 4 }, () => request("quotes"));
    await vi.waitFor(() => expect(finish).toHaveLength(4));
    const observer = request("observer"),
      pipeline = request("quotes");
    finish[0]?.();
    await vi.waitFor(() => expect(finish).toHaveLength(5));
    expect(events.filter((e) => e.kind === "send").at(-1)).toMatchObject({ category: "quotes" });
    finish[1]?.();
    await vi.waitFor(() => expect(finish).toHaveLength(6));
    for (const done of finish) {
      try {
        done();
      } catch {}
    }
    await Promise.all([...first, observer, pipeline]);
    expect(transport.maxActive).toBe(4);
    expect(transport.active).toBe(0);
  });
  it("counts retries at actual dispatch and protects the closing reserve", async () => {
    const events: Event[] = [];
    let calls = 0;
    const underlying: Fetch = async (_url, init) =>
      ++calls === 1
        ? new Response("", { status: 500 })
        : success(JSON.parse(String(init.body)), "0x1");
    const transport = new RunTransport(
      1,
      3,
      1,
      clock.mono() + 10_000,
      clock,
      (e) => events.push(e),
      underlying,
    );
    const rpc = new RpcSession({
      url: "https://fixture.invalid",
      fetch: transport.fetchFor(() => "control"),
      onLogicalRead: () => transport.logical("control"),
    });
    try {
      expect(await rpc.chain()).toBe(1n);
      await expect(rpc.chain()).rejects.toMatchObject({ reason: "budget" });
    } finally {
      rpc.close();
    }
    expect(
      events.filter((e) => e.kind === "send").map((e) => (e.kind === "send" ? e.retry : 0)),
    ).toEqual([1, 2]);
    const closing = new RpcSession({
      url: "https://fixture.invalid",
      fetch: transport.fetchFor(() => "reconciliation"),
    });
    try {
      expect(await closing.chain()).toBe(1n);
    } finally {
      closing.close();
    }
    expect(transport.sends).toBe(3);
  });
  it("cancels both queued sends and hanging response bodies without leaking slots", async () => {
    const stop = new AbortController();
    const transport = new RunTransport(
      1,
      20,
      0,
      clock.mono() + 10_000,
      clock,
      () => {},
      async () => new Response(new ReadableStream({ start() {} })),
    );
    const requests = Array.from({ length: 5 }, () =>
      transport
        .fetchFor(() => "observer")("https://fixture.invalid", {
          body: '{"method":"eth_getBlockByNumber"}',
          signal: stop.signal,
        })
        .catch(() => "cancelled"),
    );
    await vi.waitFor(() => expect(transport.active).toBe(4));
    stop.abort();
    expect(await Promise.all(requests)).toEqual(Array(5).fill("cancelled"));
    expect(transport.active).toBe(0);
    expect(transport.sends).toBe(4);
  });
});

function liveShapedFixture(): Fetch {
  const started = Date.now();
  const known = new Set<string>();
  const base = quoteFixture({ timestamp: BigInt(Math.floor(Date.now() / 1000)) });
  return async (url, init) => {
    const request = JSON.parse(String(init.body));
    if (request.method === "eth_getBlockByNumber") {
      const height =
        request.params[0] === "latest"
          ? 100n + BigInt(Math.floor((Date.now() - started) / 200))
          : BigInt(request.params[0]);
      const block = {
        number: `0x${height.toString(16)}`,
        hash: hash(height),
        parentHash: hash(height - 1n),
        timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
      };
      known.add(block.hash);
      return success(request, block);
    }
    if (
      (request.method === "eth_call" || request.method === "eth_getCode") &&
      known.has(request.params[1]?.blockHash)
    )
      request.params[1].blockHash = BLOCK_HASH;
    return base.fetch(url, { ...init, body: JSON.stringify(request) });
  };
}
const fixtureSourceCore = { head: "constructed-test", patchSha256: "0".repeat(64), files: [] };
const fixtureSource = { ...fixtureSourceCore, sha256: digest(fixtureSourceCore) };
describe("ARB-01 real pipeline, read-only reporting and ownership integration", () => {
  it("closes two prospective windows, reproduces offline, and rejects a missing SQLite reference", async () => {
    const root = temporary();
    const result = await runExperiment({
      root,
      env: {},
      outputDir: "nested/run",
      fetch: liveShapedFixture(),
      fixture: {
        source: fixtureSource,
        settings: {
          ...SETTINGS,
          blocks: 2,
          delayMs: 20,
          pollMs: 10,
          windowMs: 4000,
          reserveMs: 500,
          sends: 1000,
          reserveSends: 50,
          preflightMs: 2000,
        },
      },
    });
    expect(result.reason).toBe("complete");
    expect(result.windows).toBe(2);
    expect(result.cleanup).toBe(true);
    expect(existsSync(join(result.outputDir, "evidence.sqlite.owner"))).toBe(false);
    const database = readFileSync(join(result.outputDir, "evidence.sqlite"));
    const a = buildReport(result.outputDir),
      b = buildReport(result.outputDir);
    expect(digest(a)).toBe(digest(b));
    expect(a.origin).toBe("fixture");
    expect(a.complete).toBe(true);
    expect(a.windows).toHaveLength(2);
    expect(a.windows[1]?.start).toBeGreaterThan(a.windows[0]?.end ?? 0n);
    expect(a.windows.every((w) => Object.values(w.coverage).reduce((x, y) => x + y, 0) === 2)).toBe(
      true,
    );
    expect(readFileSync(join(result.outputDir, "evidence.sqlite"))).toEqual(database);
    expect(a.rpc.every((r) => r.maxActive !== null && r.maxActive <= 4)).toBe(true);
    const original = readJournal(join(result.outputDir, "journal.jsonl")).events;
    const missing = join(root, "missing-reference");
    const journal = new Journal(missing);
    for (const e of original)
      journal.append(
        e.kind === "attempt" && e.analysisRevision ? { ...e, analysisRevision: "f".repeat(64) } : e,
      );
    journal.close();
    writeFileSync(join(result.outputDir, "journal.jsonl"), readFileSync(missing));
    expect(() => buildReport(result.outputDir)).toThrow();
  }, 10_000);
  it("stops the whole invocation on preflight failure, preserving partial evidence and ownership cleanup", async () => {
    const root = temporary();
    const result = await runExperiment({
      root,
      env: {},
      outputDir: "run",
      fetch: async () => new Response("", { status: 403 }),
      fixture: {
        source: fixtureSource,
        settings: { ...SETTINGS, windowMs: 1000, reserveMs: 100, preflightMs: 500 },
      },
    });
    expect(result.windows).toBe(0);
    expect(result.reason).toBe("rpc_configuration");
    expect(existsSync(join(result.outputDir, "evidence.sqlite.owner"))).toBe(false);
    const report = buildReport(result.outputDir);
    expect(report.complete).toBe(false);
    expect(report.windows).toHaveLength(0);
    await expect(
      runExperiment({
        root,
        env: {},
        outputDir: "run",
        fixture: { source: fixtureSource, settings: SETTINGS },
      }),
    ).rejects.toThrow();
  });
  it("exposes help and rejects mixed/duplicate options before network or output creation", () => {
    const cli = new URL("../src/research.ts", import.meta.url);
    const help = spawnSync(process.execPath, [cli.pathname, "--help"], {
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("128-block");
    const invalid = spawnSync(
      process.execPath,
      [cli.pathname, "run", "--output-dir", "secret", "--output-dir", "another"],
      { encoding: "utf8" },
    );
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).not.toContain("secret");
  });
  it("cancels after the first window, refuses a competing producer and preserves an unrelated owner", async () => {
    const root = temporary();
    const other = acquireProducer(join(root, "other.sqlite"));
    const stop = new AbortController();
    let competitorRefused = false;
    try {
      const result = await runExperiment({
        root,
        env: {},
        outputDir: "run",
        fetch: liveShapedFixture(),
        signal: stop.signal,
        fixture: {
          source: fixtureSource,
          settings: {
            ...SETTINGS,
            blocks: 2,
            delayMs: 20,
            pollMs: 10,
            windowMs: 4000,
            reserveMs: 500,
            sends: 1000,
            reserveSends: 50,
            preflightMs: 2000,
          },
        },
        progress: (value) => {
          const phase = value as { phase: string };
          if (phase.phase === "preflight") {
            try {
              acquireProducer(join(root, "run/evidence.sqlite"));
            } catch {
              competitorRefused = true;
            }
          }
          if (phase.phase === "window-closed") stop.abort();
        },
      });
      expect(result.reason).toBe("cancelled");
      expect(result.windows).toBe(1);
      expect(result.cleanup).toBe(true);
      expect(competitorRefused).toBe(true);
      other.assertOwned();
      expect(existsSync(join(result.outputDir, "evidence.sqlite.owner"))).toBe(false);
      expect(buildReport(result.outputDir).complete).toBe(false);
    } finally {
      other.release();
    }
  });
  it("retains a journal failure as incomplete and still releases producer ownership", async () => {
    const root = temporary();
    const append = vi.spyOn(Journal.prototype, "append").mockImplementationOnce(() => {
      throw new Error("constructed disk fault");
    });
    try {
      const result = await runExperiment({
        root,
        env: {},
        outputDir: "run",
        fetch: liveShapedFixture(),
        fixture: { source: fixtureSource, settings: SETTINGS },
      });
      expect(result.reason).toBe("journal_failure");
      expect(result.cleanup).toBe(true);
      expect(existsSync(join(result.outputDir, "evidence.sqlite.owner"))).toBe(false);
    } finally {
      append.mockRestore();
    }
  });
  it("stops on observer authorization failure without waiting out a window or arming another", async () => {
    const root = temporary();
    const base = liveShapedFixture();
    const fetch: Fetch = (url, init, context) => {
      const request = JSON.parse(String(init.body));
      return request.method === "eth_getBlockByNumber" &&
        request.params[0] === "latest" &&
        request.id === 1
        ? Promise.resolve(new Response("", { status: 403 }))
        : base(url, init, context);
    };
    const result = await runExperiment({
      root,
      env: {},
      fetch,
      fixture: {
        source: fixtureSource,
        settings: {
          ...SETTINGS,
          blocks: 2,
          delayMs: 20,
          pollMs: 10,
          windowMs: 4000,
          reserveMs: 500,
        },
      },
    });
    expect(result.reason).toBe("rpc_configuration");
    expect(result.windows).toBe(0);
    expect(result.cleanup).toBe(true);
    const report = buildReport(result.outputDir);
    expect(report.complete).toBe(false);
    expect(report.windows).toHaveLength(1);
    expect(report.rpc.find((r) => r.window === 1)?.observerFailures).toEqual({ authorization: 1 });
  });
  it("reports source-tool failure explicitly without exposing the child-process error", () => {
    expect(() => sourceIdentity(temporary())).toThrow("source_identity_unavailable");
  });
});

// Constructed continuation metadata only; these bytes are deliberately not market/SQLite evidence.
function continuationFixture(blocks = 128) {
  const directory = temporary();
  const now = Date.now();
  const manifest: Manifest = {
    format: "arb-01-v1",
    runId: "constructed-continuation-test",
    origin: "live",
    created: { wall: now - 1000, mono: 0 },
    source: fixtureSource,
    runtime: { node: process.version, bun: "constructed" },
    providerLabel: "constructed",
    configurationRevision: "constructed",
    settings: SETTINGS,
    sizes: SIZES,
    policies: null,
    registry: null,
    quoteSource: null,
  };
  const journal = new Journal(join(directory, "journal.jsonl"));
  journal.append({ kind: "manifest", manifest });
  journal.append({
    kind: "window-end",
    window: 0,
    at: { wall: now - 900, mono: 100 },
    reason: "preflight_closed",
    sends: 104,
    maxActive: 4,
  });
  journal.append({ ...windowEvent, armed: manifest.created, end: 227n });
  for (let i = 0; i < blocks; i++)
    journal.append({
      kind: "canonical",
      window: 1,
      at: { wall: now - 600, mono: 400 },
      height: 100n + BigInt(i),
      header: header(100n + BigInt(i)),
      reason: null,
    });
  journal.append({
    kind: "end",
    at: { wall: now - 500, mono: 500 },
    reason: "source_identity_unavailable",
    windows: 0,
    cleanup: true,
  });
  journal.close();
  writeFileSync(join(directory, "evidence.sqlite"), "constructed metadata test");
  writeFileSync(
    join(directory, "source-recovery.json"),
    JSON.stringify({
      format: "arb-01-source-recovery-v1",
      verifiedAtMs: now,
      sourceSha256: fixtureSource.sha256,
      journalSha256: hashBytes(readFileSync(join(directory, "journal.jsonl"))),
      databaseSha256: hashBytes(readFileSync(join(directory, "evidence.sqlite"))),
    }),
  );
  return directory;
}
describe("ARB-01 continuation bounds", () => {
  it("allows only the still-unstarted second window and retains the original preflight/time budget", () => {
    const plan = continuationPlan(continuationFixture(), process.cwd(), fixtureSource);
    expect(plan.previousEnd).toBe(227n);
    expect(plan.preflightSendsRemaining).toBe(196);
    expect(plan.preflightMsRemaining).toBe(119900);
    expect(plan.originalDeadlineWall).toBeGreaterThan(Date.now());
    expect(plan.sourceComparison).toBe("unchanged_financial_pipeline_control_revision");
  });
  it("rejects partial windows and changes to the financial pipeline/provider configuration", () => {
    expect(() => continuationPlan(continuationFixture(127), process.cwd(), fixtureSource)).toThrow(
      "continuation_not_eligible",
    );
    expect(() =>
      continuationPlan(continuationFixture(), process.cwd(), {
        ...fixtureSource,
        files: [{ path: "packages/domain/src/index.ts", sha256: "changed" }],
      }),
    ).toThrow("financial_pipeline_changed");
    expect(() =>
      continuationPlan(continuationFixture(), process.cwd(), fixtureSource, {
        providerLabel: "changed",
        configurationRevision: "constructed",
      }),
    ).toThrow("configuration_mismatch");
  });
});
