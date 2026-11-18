import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocalConfig } from "../../../apps/backend/src/local-config.ts";
import {
  childEnvironments,
  type LauncherEvent,
  type LaunchOptions,
  runLocal,
} from "../launcher.ts";

const fixture = fileURLToPath(new URL("./fixtures/application.ts", import.meta.url));
const roots: string[] = [];
const servers: Server[] = [];
const timing = { readinessMs: 2000, probeMs: 20, requestMs: 100, gracefulMs: 100, forceMs: 2000 };
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((done) => server.close(() => done()))),
  );
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function root() {
  const value = mkdtempSync(resolve(tmpdir(), "pooltrace-launcher-"));
  roots.push(value);
  return value;
}
async function ports() {
  const sockets = [createServer(), createServer()];
  await Promise.all(
    sockets.map(
      (server) =>
        new Promise<void>((done, fail) => {
          server.once("error", fail);
          server.listen(0, "127.0.0.1", done);
        }),
    ),
  );
  const values = sockets.map((server) => {
    const address = server.address();
    if (!address || typeof address === "string") throw Error("address");
    return String(address.port);
  });
  await Promise.all(
    sockets.map((server) => new Promise<void>((done) => server.close(() => done()))),
  );
  return { POOLTRACE_BACKEND_PORT: values[0] as string, POOLTRACE_WEB_PORT: values[1] as string };
}
function entries(backend: Record<string, unknown> = {}, web: Record<string, unknown> = {}) {
  return {
    backend: [fixture, "backend", JSON.stringify(backend)],
    web: [fixture, "web", JSON.stringify(web)],
  };
}
function running(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function settings(): Promise<LaunchOptions> {
  return { root: root(), env: await ports(), timing, entries: entries() };
}
function stopWhenReady(controller: AbortController, events: LauncherEvent[], signal = "SIGINT") {
  return (event: LauncherEvent) => {
    events.push(event);
    if (event.application === "web" && event.state === "ready") controller.abort(signal);
  };
}

describe("local launcher configuration", () => {
  it.each(
    [
      [],
      ["--mode", "demo"],
      ["--mode", "fixture", "--mode", "live"],
      ["--unknown"],
      ["--help", "--mode", "fixture"],
    ].map((args) => ({ args })),
  )("rejects invalid arguments $args before child work", async ({ args }) => {
    const events: LauncherEvent[] = [];
    expect(
      await runLocal(args, { root: root(), env: {}, onEvent: (event) => events.push(event) }),
    ).toEqual({ exitCode: 2, reason: "usage" });
    expect(events).toEqual([]);
  });
  it("returns help without loading nonexistent private configuration or spawning", async () => {
    expect(
      await runLocal(["--help"], { root: "/nonexistent/pooltrace", env: {}, platform: "win32" }),
    ).toEqual({ exitCode: 0, reason: null });
  });
  it.each([
    { POOLTRACE_BACKEND_PORT: "1" },
    { POOLTRACE_BACKEND_PORT: "4318" },
    { POOLTRACE_WEB_PORT: "65536" },
    { POOLTRACE_COLLECTION_DELAY_MS: "0" },
    { POOLTRACE_DB_PATH: ":memory:" },
    { USDC_INPUT_AMOUNTS: "[1,2]" },
  ])("validates full settings before spawn %j", async (env) => {
    const events: LauncherEvent[] = [];
    const result = await runLocal(["--mode", "fixture"], {
      root: root(),
      env,
      onEvent: (event) => events.push(event),
    });
    expect(result).toEqual({ exitCode: 2, reason: "configuration" });
    expect(events).toEqual([]);
  });
  it("rejects missing live RPC configuration before spawn", async () => {
    expect(await runLocal(["--mode", "live"], { root: root(), env: {} })).toEqual({
      exitCode: 2,
      reason: "configuration",
    });
  });
  it("rejects unsupported process-group platform", async () => {
    expect(
      await runLocal(["--mode", "fixture"], { root: root(), env: {}, platform: "win32" }),
    ).toEqual({ exitCode: 1, reason: "platform_unsupported" });
  });
  it("shares root-file/process precedence while isolating the web environment", () => {
    const directory = root();
    writeFileSync(
      resolve(directory, ".env"),
      "POOLTRACE_WEB_PORT=4500\nRPC_PROVIDER_LABEL=file\nPOOLTRACE_DB_PATH=old.sqlite\n",
    );
    writeFileSync(resolve(directory, ".env.local"), "POOLTRACE_WEB_PORT=4501\n");
    const config = loadLocalConfig(
      directory,
      {
        POOLTRACE_WEB_PORT: "4502",
        ETHEREUM_RPC_URL: "https://secret.example/key",
        PRIVATE_SECRET: "sentinel",
        NODE_OPTIONS: "--inspect",
      },
      "fixture",
    );
    const environment = childEnvironments(config, "fresh-run");
    expect(environment.web.POOLTRACE_WEB_PORT).toBe("4502");
    expect(Object.keys(environment.web).sort()).toEqual([
      "POOLTRACE_API_ORIGIN",
      "POOLTRACE_BACKEND_PORT",
      "POOLTRACE_RUN_ID",
      "POOLTRACE_WEB_PORT",
    ]);
    expect(environment.backend.POOLTRACE_DB_PATH).toBe(resolve(directory, "old.sqlite"));
    expect(environment.backend.ETHEREUM_RPC_URL).toBe("https://fixture.invalid");
    expect(environment.web).not.toHaveProperty("ETHEREUM_RPC_URL");
    expect(environment.web).not.toHaveProperty("NODE_OPTIONS");
  });
});

describe("owned local application processes", () => {
  it.each(["SIGINT", "SIGTERM"])(
    "starts delayed applications and forwards %s with fresh identity and no raw child output",
    async (signal) => {
      const options = await settings();
      const controller = new AbortController();
      const events: LauncherEvent[] = [];
      const backend = resolve(options.root, "backend.json"),
        web = resolve(options.root, "web.json"),
        signals = resolve(options.root, "signals");
      const result = await runLocal(["--mode", "fixture"], {
        ...options,
        signal: controller.signal,
        env: { ...options.env, POOLTRACE_RUN_ID: "00000000-0000-0000-0000-000000000000" },
        entries: entries(
          {
            delay: 50,
            report: backend,
            signals,
            noisy: "https://private.example/key /private/sentinel",
          },
          { report: web, signals },
        ),
        onEvent: stopWhenReady(controller, events, signal),
      });
      expect(result).toEqual({ exitCode: signal === "SIGINT" ? 130 : 143, reason: "cancelled" });
      const a = JSON.parse(readFileSync(backend, "utf8")) as {
        pid: number;
        env: Record<string, string>;
      };
      const b = JSON.parse(readFileSync(web, "utf8")) as {
        pid: number;
        env: Record<string, string>;
      };
      expect(a.env.POOLTRACE_RUN_ID).toBe(b.env.POOLTRACE_RUN_ID);
      expect(a.env.POOLTRACE_RUN_ID).not.toBe("00000000-0000-0000-0000-000000000000");
      expect(running(a.pid)).toBe(false);
      expect(running(b.pid)).toBe(false);
      expect(readFileSync(signals, "utf8")).toContain(signal);
      expect(JSON.stringify(events)).not.toContain("private.example");
      expect(JSON.stringify(events)).not.toContain("/private/sentinel");
      expect(
        events.filter((event) => event.state === "ready").map((event) => event.application),
      ).toEqual(["backend", "web"]);
    },
  );
  it.each(["role", "run", "version", "instance"])(
    "rejects wrong readiness %s and cleans up",
    async (wrong) => {
      const options = await settings();
      expect(
        await runLocal(["--mode", "fixture"], { ...options, entries: entries({ wrong }) }),
      ).toEqual({ exitCode: 1, reason: "readiness_invalid" });
    },
  );
  it.each([{ malformed: true }, { oversize: true }])(
    "rejects malformed or oversized health %j",
    async (spec) => {
      const options = await settings();
      expect(await runLocal(["--mode", "fixture"], { ...options, entries: entries(spec) })).toEqual(
        { exitCode: 1, reason: "readiness_invalid" },
      );
    },
  );
  it("times out missing readiness and stops its owned process", async () => {
    const options = await settings();
    const report = resolve(options.root, "process.json");
    expect(
      await runLocal(["--mode", "fixture"], {
        ...options,
        timing: { ...timing, readinessMs: 250 },
        entries: entries({ noReady: true, report }),
      }),
    ).toEqual({ exitCode: 1, reason: "readiness_timeout" });
    expect(running((JSON.parse(readFileSync(report, "utf8")) as { pid: number }).pid)).toBe(false);
  });
  it("reports early process exit", async () => {
    const options = await settings();
    expect(
      await runLocal(["--mode", "fixture"], { ...options, entries: entries({ exitBefore: true }) }),
    ).toEqual({ exitCode: 1, reason: "child_exited" });
  });
  it("reports missing entrypoint without exposing filesystem paths", async () => {
    const options = await settings();
    const events: LauncherEvent[] = [];
    const result = await runLocal(["--mode", "fixture"], {
      ...options,
      entries: { ...entries(), backend: [resolve(options.root, "private-missing.ts")] },
      onEvent: (event) => events.push(event),
    });
    expect(result).toEqual({ exitCode: 1, reason: "child_exited" });
    expect(JSON.stringify(events)).not.toContain(options.root);
  });
  it.each(["backend", "web"] as const)(
    "stops the sibling when %s fails after readiness",
    async (application) => {
      const options = await settings();
      const a = resolve(options.root, "backend.json"),
        b = resolve(options.root, "web.json");
      const result = await runLocal(["--mode", "fixture"], {
        ...options,
        entries: entries(
          { report: a, ...(application === "backend" ? { exitAfter: 400 } : {}) },
          { report: b, ...(application === "web" ? { exitAfter: 150 } : {}) },
        ),
      });
      expect(result).toEqual({ exitCode: 1, reason: "child_exited" });
      for (const path of [a, b])
        expect(running((JSON.parse(readFileSync(path, "utf8")) as { pid: number }).pid)).toBe(
          false,
        );
    },
  );
  it("detects an exited backend while the web application is still starting", async () => {
    const options = await settings();
    const before = performance.now();
    const result = await runLocal(["--mode", "fixture"], {
      ...options,
      entries: entries({ exitAfter: 150 }, { noReady: true }),
    });
    expect(result).toEqual({ exitCode: 1, reason: "child_exited" });
    expect(performance.now() - before).toBeLessThan(timing.readinessMs);
  });
  it("cancels startup and repeated interruption does not duplicate cleanup", async () => {
    const options = await settings();
    const controller = new AbortController();
    let stops = 0;
    const timer = setTimeout(() => {
      controller.abort("SIGINT");
      controller.abort("SIGTERM");
    }, 70);
    try {
      expect(
        await runLocal(["--mode", "fixture"], {
          ...options,
          signal: controller.signal,
          entries: entries({ noReady: true }),
          onEvent: (event) => {
            if (event.state === "stopping") stops++;
          },
        }),
      ).toEqual({ exitCode: 130, reason: "cancelled" });
    } finally {
      clearTimeout(timer);
    }
    expect(stops).toBe(1);
  });
  it("refuses an unrelated healthy listener without adopting or signalling it", async () => {
    const options = await settings();
    const sentinel = createServer((_req, res) => {
      res.end(
        JSON.stringify({
          contractVersion: "local-process-v1",
          application: "backend",
          runId: "unrelated",
          instanceId: "00000000-0000-0000-0000-000000000000",
          phase: "ready",
        }),
      );
    });
    servers.push(sentinel);
    await new Promise<void>((done) =>
      sentinel.listen(Number(options.env.POOLTRACE_BACKEND_PORT), "127.0.0.1", done),
    );
    const result = await runLocal(["--mode", "fixture"], options);
    expect(result.exitCode).toBe(1);
    expect(sentinel.listening).toBe(true);
    expect(
      (await fetch(`http://127.0.0.1:${options.env.POOLTRACE_BACKEND_PORT}/healthz`)).status,
    ).toBe(200);
  });
  it("rejects an unavailable web root and stops both applications", async () => {
    const options = await settings();
    expect(
      await runLocal(["--mode", "fixture"], {
        ...options,
        entries: entries({}, { rootStatus: 500 }),
      }),
    ).toEqual({ exitCode: 1, reason: "readiness_invalid" });
  });
  it("escalates an ignored stop and cleans up owned descendants", async () => {
    const options = await settings();
    const controller = new AbortController();
    const descendant = resolve(options.root, "descendant"),
      report = resolve(options.root, "parent.json");
    const result = await runLocal(["--mode", "fixture"], {
      ...options,
      signal: controller.signal,
      entries: entries({ report, descendant, ignoreSignals: true }),
      onEvent: stopWhenReady(controller, []),
    });
    expect(result).toEqual({ exitCode: 130, reason: "cancelled" });
    const nested = Number(readFileSync(descendant, "utf8"));
    for (let count = 0; count < 40 && running(nested); count++) await pause(25);
    expect(running(nested)).toBe(false);
    expect(running((JSON.parse(readFileSync(report, "utf8")) as { pid: number }).pid)).toBe(false);
  });
});
