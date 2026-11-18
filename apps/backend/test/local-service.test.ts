import { EventEmitter } from "node:events";
import { request, type ServerResponse } from "node:http";
import {
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli-runner.ts";
import { loadLocalConfig, parseLocalArgs, runtimeEnvironment } from "../src/local-config.ts";
import { acquireProducer } from "../src/producer-guard.ts";
import { startService, writeStatusFrame } from "../src/service.ts";

const stops: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) await stop();
});
const root = () => mkdtempSync(join(tmpdir(), "pooltrace-service-"));
async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}
async function ready() {
  let elapsed = 0;
  const wall = Date.now();
  const clock = { wall: () => wall + elapsed, mono: () => elapsed };
  const path = root(),
    backendPort = await freePort(),
    webPort = await freePort();
  const config = loadLocalConfig(
    path,
    { POOLTRACE_BACKEND_PORT: String(backendPort), POOLTRACE_WEB_PORT: String(webPort) },
    "fixture",
  );
  const service = await startService(config, { clock });
  stops.push(service.stop);
  let current: ReturnType<typeof service.current> | undefined;
  for (let i = 0; i < 100; i++) {
    current = service.current();
    if (current.result?.analysis) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  expect(current?.result?.analysis?.rows).toHaveLength(36);
  return {
    service,
    config,
    path,
    advance: (ms: number) => {
      elapsed += ms;
    },
  };
}
describe("local configuration and producer ownership", () => {
  it.each(
    [
      [],
      ["--mode", "live", "--mode", "fixture"],
      ["--mode", "other"],
      ["--mode", "fixture", "unknown"],
      ["--help", "--mode", "live"],
    ].map((args) => ({ args })),
  )("rejects invalid arguments %j", ({ args }) => {
    expect(() => parseLocalArgs(args)).toThrow();
  });
  it("help and fixture settings do not require live credentials; private runtime variables stay out", () => {
    expect(parseLocalArgs(["--help"])).toEqual({ help: true, mode: null });
    const config = loadLocalConfig(root(), { ETHEREUM_RPC_URL: "bad" }, "fixture");
    expect(config.sizes).toHaveLength(6);
    expect(
      runtimeEnvironment({ PATH: "/bin", NODE_OPTIONS: "secret", ETHEREUM_RPC_URL: "secret" }),
    ).toEqual({ PATH: "/bin" });
  });
  it.each([
    { POOLTRACE_BACKEND_PORT: "4318" },
    { POOLTRACE_API_ORIGIN: "https://example.com" },
    { POOLTRACE_COLLECTION_DELAY_MS: "0" },
    { USDC_INPUT_AMOUNTS: '["1"]' },
    { POOLTRACE_DB_PATH: ":memory:" },
  ])("rejects configuration %j before filesystem setup", (env) => {
    const path = root();
    expect(() => loadLocalConfig(path, env, "fixture")).toThrow();
    expect(existsSync(join(path, "data"))).toBe(false);
  });
  it("creates missing parents, excludes a competing producer, and releases only its own token", () => {
    const db = join(root(), "missing", "evidence.sqlite"),
      guard = acquireProducer(db);
    expect(existsSync(db)).toBe(false);
    expect(() => acquireProducer(db)).toThrow("producer_unavailable");
    const owner = JSON.parse(readFileSync(`${db}.owner`, "utf8"));
    expect(typeof owner.token).toBe("string");
    guard.release();
    expect(existsSync(`${db}.owner`)).toBe(false);
    const next = acquireProducer(db);
    next.release();
  });
  it("canonicalizes symlink aliases and rejects hard links", () => {
    const path = root(),
      db = join(path, "evidence.sqlite");
    writeFileSync(db, "");
    symlinkSync(db, join(path, "alias.sqlite"));
    const guard = acquireProducer(db);
    expect(() => acquireProducer(join(path, "alias.sqlite"))).toThrow();
    guard.release();
    linkSync(db, join(path, "hard.sqlite"));
    expect(() => acquireProducer(db)).toThrow();
  });
  it("fails closed on malformed and changed owner files", () => {
    const db = join(root(), "evidence.sqlite");
    writeFileSync(`${db}.owner`, "broken");
    expect(() => acquireProducer(db)).toThrow();
    const other = join(root(), "evidence.sqlite"),
      guard = acquireProducer(other);
    writeFileSync(`${other}.owner`, '{"token":"other"}');
    expect(() => guard.release()).toThrow();
    expect(existsSync(`${other}.owner`)).toBe(true);
  });
  it("blocks the CLI before fixture collection if the evidence file is owned", async () => {
    const path = root(),
      db = join(path, "evidence.sqlite"),
      guard = acquireProducer(db);
    let called = false;
    try {
      const result = await runCli(["--mode", "fixture"], {
        root: path,
        env: { POOLTRACE_DB_PATH: db },
        fixtureFactory: () => {
          called = true;
          throw new Error();
        },
      });
      expect(result.exitCode).toBe(1);
      expect(result.envelope?.reason).toBe("producer_unavailable");
      expect(called).toBe(false);
    } finally {
      guard.release();
    }
  });
});
describe("real local read API", () => {
  it("withdraws expired admission without changing saved quotation evidence", async () => {
    const { service, advance } = await ready();
    const initial = service.current();
    expect(
      initial.result?.eligibility?.best,
      JSON.stringify(
        {
          status: initial.result?.status,
          state: initial.result?.eligibility,
          failures: initial.result?.analysis?.failures,
        },
        (_, value) => (typeof value === "bigint" ? value.toString() : value),
      ),
    ).not.toBeNull();
    const values = initial.result?.analysis?.rows.map((row) => row.gross);
    advance(5100);
    const expired = service.current();
    expect(expired.result?.status).toBe("stale");
    expect(expired.validForMs).toBe(0);
    expect(expired.result?.eligibility?.best).toBeNull();
    expect(expired.result?.persistence.status).toBe("saved");
    expect(expired.result?.analysis?.rows.map((row) => row.gross)).toEqual(values);
    expect(expired.attempts).toBe(1);
  });
  it("keeps one collector and round-trips an exact analysis revision from history", async () => {
    const { service, config } = await ready();
    const health = await fetch(`${config.apiOrigin}/healthz`).then((r) => r.json());
    expect(health).toMatchObject({
      contractVersion: "local-process-v1",
      application: "backend",
      runId: config.runId,
      phase: "ready",
    });
    const current = await fetch(`${config.apiOrigin}/api/v1/current`).then((r) => r.json());
    expect(current.result.persistence.status).toBe("saved");
    expect(current.result.eligibility.workloadAdmitted).toBe(false);
    expect(current.result.analysis.rows).toHaveLength(36);
    const page = await fetch(`${config.apiOrigin}/api/v1/history/analyses?limit=1`).then((r) =>
      r.json(),
    );
    const row = page.rows[0];
    expect(row.revision_id).toMatch(/^[0-9a-f]{64}$/);
    const response = await fetch(`${config.apiOrigin}/api/v1/history/analyses/${row.revision_id}`);
    expect(response.status).toBe(200);
    const detail = await response.json();
    expect(detail.context).toBe("historical");
    expect(detail.eligibleForLiveQualification).toBe(false);
    expect(detail.currentBest).toBeNull();
    expect(detail.value.attemptId).toBe(row.analysis_id);
    expect(detail.value.rows).toHaveLength(36);
    await Promise.all(Array.from({ length: 5 }, () => fetch(`${config.apiOrigin}/api/v1/current`)));
    expect(service.current().attempts).toBe(1);
    expect(
      (await fetch(`${config.apiOrigin}/api/v1/history/analyses/${"0".repeat(64)}`)).status,
    ).toBe(404);
  });
  it("validates method, host/origin and list boundaries without leaking private fields", async () => {
    const { config } = await ready();
    expect((await fetch(`${config.apiOrigin}/api/v1/current`, { method: "POST" })).status).toBe(
      405,
    );
    expect(
      (
        await fetch(`${config.apiOrigin}/api/v1/current`, {
          headers: { Origin: "https://example.com" },
        })
      ).status,
    ).toBe(400);
    const wrongHost = await new Promise<number | undefined>((done, reject) => {
      const req = request(
        `${config.apiOrigin}/api/v1/current`,
        { headers: { Host: "example.com" } },
        (response) => {
          response.resume();
          done(response.statusCode);
        },
      );
      req.on("error", reject);
      req.end();
    });
    expect(wrongHost).toBe(400);
    for (const query of ["limit=101", "limit=1&limit=2", "bad=true", "highWater=1", "origin=other"])
      expect((await fetch(`${config.apiOrigin}/api/v1/history/analyses?${query}`)).status).toBe(
        400,
      );
    const response = await fetch(`${config.apiOrigin}/api/v1/current`, {
      headers: { Origin: config.webOrigin },
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(config.webOrigin);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const text = await response.text();
    expect(text).not.toContain(config.dbPath);
    expect(text).not.toContain("fixture.invalid");
  });
  it("limits SSE subscribers and resynchronizes with status rather than replay", async () => {
    const { config, service } = await ready();
    const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
    try {
      for (let i = 0; i < 16; i++) {
        const r = await fetch(`${config.apiOrigin}/api/v1/events`, {
          headers: { "Last-Event-ID": "old:10" },
        });
        expect(r.status).toBe(200);
        const reader = r.body?.getReader();
        if (!reader) throw new Error();
        readers.push(reader);
        const frame = new TextDecoder().decode((await reader.read()).value);
        expect(frame).toContain("event: status");
        expect(frame).toContain(service.instanceId);
        expect(frame).not.toContain('"rows"');
        const event = frame
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice(6))
          .join("\n");
        expect(JSON.parse(event)).toMatchObject({
          apiVersion: "local-api-v1",
          instanceId: service.instanceId,
          mode: "fixture",
        });
      }
      expect((await fetch(`${config.apiOrigin}/api/v1/events`)).status).toBe(503);
      expect(service.current().attempts).toBe(1);
    } finally {
      await Promise.all(readers.map((reader) => reader.cancel()));
    }
  });
  it("shutdown releases ownership and a restart restores only historical evidence", async () => {
    const { service, config } = await ready();
    await service.stop();
    expect(existsSync(`${config.dbPath}.owner`)).toBe(false);
    const restarted = await startService(config);
    stops.push(restarted.stop);
    expect(restarted.current().result).toBeNull();
    const page = await fetch(`${config.apiOrigin}/api/v1/history/analyses`).then((r) => r.json());
    expect(page.rows.length).toBeGreaterThan(0);
  });
});

describe("controlled slow-stream failures", () => {
  class Stream extends EventEmitter {
    destroyed = false;
    writableLength = 0;
    write = vi.fn(() => false);
    destroy = vi.fn(() => {
      this.destroyed = true;
      this.emit("close");
      return this;
    });
  }
  it("disconnects a client before queued output exceeds the accepted bound", () => {
    const stream = new Stream();
    stream.writableLength = 128 * 1024;
    writeStatusFrame(stream as unknown as ServerResponse, "x");
    expect(stream.destroy).toHaveBeenCalledOnce();
    expect(stream.write).not.toHaveBeenCalled();
  });
  it("disconnects an undrained client after five seconds and cancels timeout on drain", () => {
    vi.useFakeTimers();
    try {
      const slow = new Stream();
      writeStatusFrame(slow as unknown as ServerResponse, "status");
      vi.advanceTimersByTime(4999);
      expect(slow.destroy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(slow.destroy).toHaveBeenCalledOnce();
      const recovered = new Stream();
      writeStatusFrame(recovered as unknown as ServerResponse, "status");
      recovered.emit("drain");
      vi.advanceTimersByTime(5000);
      expect(recovered.destroy).not.toHaveBeenCalled();
      expect(recovered.listenerCount("close")).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
