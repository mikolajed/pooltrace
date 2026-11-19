import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeEnvironment } from "../../apps/backend/src/local-config.ts";

const source = fileURLToPath(new URL("../../", import.meta.url));
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
async function freePorts() {
  const servers = [createServer(), createServer()];
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((done, fail) => {
          server.once("error", fail);
          server.listen(0, "127.0.0.1", done);
        }),
    ),
  );
  const ports = servers.map((server) => {
    const address = server.address();
    if (!address || typeof address === "string") throw Error("test_ports");
    return address.port;
  });
  await Promise.all(
    servers.map((server) => new Promise<void>((done) => server.close(() => done()))),
  );
  return ports as [number, number];
}

export async function fixtureApp() {
  const directory = mkdtempSync(join(tmpdir(), "pooltrace-browser-"));
  const root = join(directory, "source");
  // Copy real source without private configuration/output, then install the exact frozen graph.
  for (const name of ["apps", "packages", "scripts/local"]) {
    cpSync(join(source, name), join(root, name), {
      recursive: true,
      filter: (path) => {
        const name = basename(path);
        return (
          !["node_modules", ".next", "next-env.d.ts"].includes(name) &&
          !name.startsWith(".env") &&
          !name.endsWith(".tsbuildinfo")
        );
      },
    });
  }
  for (const name of [
    "package.json",
    "bun.lock",
    "tsconfig.json",
    "tsconfig.base.json",
    ".node-version",
    ".bun-version",
  ])
    cpSync(join(source, name), join(root, name));
  if (existsSync(join(root, ".env")) || existsSync(join(root, ".env.local")))
    throw Error("test_configuration");
  execFileSync("bun", ["install", "--frozen-lockfile"], {
    cwd: root,
    env: runtimeEnvironment(process.env),
    timeout: 60_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const [backendPort, webPort] = await freePorts();
  const backend = `http://127.0.0.1:${backendPort}`,
    web = `http://127.0.0.1:${webPort}`;
  const database = join(directory, "evidence.sqlite");
  let child: ChildProcess | undefined;
  let closed: Promise<number | null> | undefined;
  let suspendedPid: number | undefined;
  const events: string[] = [];
  const env = {
    ...runtimeEnvironment(process.env),
    POOLTRACE_DB_PATH: database,
    POOLTRACE_BACKEND_PORT: String(backendPort),
    POOLTRACE_WEB_PORT: String(webPort),
    POOLTRACE_COLLECTION_DELAY_MS: "1000",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  async function json(path: string) {
    const response = await fetch(`${backend}${path}`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw Error("test_api");
    return response.json();
  }
  async function start() {
    child = spawn("bun", ["run", "dev", "--mode", "fixture"], {
      cwd: root,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream?.on("data", (data: Buffer) => {
        output = (output + data.toString()).slice(-32_000);
      });
    closed = new Promise((done) => {
      child?.once("error", () => done(1));
      child?.once("close", (code) => done(code));
    });
    const until = performance.now() + 60_000;
    while (performance.now() < until) {
      if (child.exitCode !== null) throw Error(`test_startup_failed: ${output}`);
      try {
        const a = await json("/healthz");
        const b = await fetch(`${web}/healthz`, { signal: AbortSignal.timeout(2000) }).then((r) =>
          r.json(),
        );
        if (
          a.phase === "ready" &&
          b.phase === "ready" &&
          a.runId === b.runId &&
          output.includes("Pooltrace web: ready")
        ) {
          events.push(`ready:${a.runId}`);
          return a.runId as string;
        }
      } catch {
        /* Readiness is polled; a deadline or owned process exit is a failure. */
      }
      await pause(100);
    }
    throw Error("test_readiness_timeout");
  }
  function resume() {
    if (suspendedPid !== undefined) {
      process.kill(suspendedPid, "SIGCONT");
      suspendedPid = undefined;
    }
  }
  async function stop(signal: "SIGINT" | "SIGTERM") {
    resume();
    if (!child?.pid || !closed) throw Error("test_not_started");
    if (child.exitCode === null) process.kill(-child.pid, signal);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const code = await Promise.race([
      closed,
      new Promise<never>((_done, fail) => {
        timeout = setTimeout(() => fail(Error("test_cleanup_timeout")), 25_000);
      }),
    ]).finally(() => clearTimeout(timeout));
    events.push(`${signal}:${code}`);
    if (existsSync(`${database}.owner`)) throw Error("test_owner_not_released");
    for (const address of [backend, web]) {
      const open = await fetch(`${address}/healthz`, { signal: AbortSignal.timeout(500) }).then(
        () => true,
        () => false,
      );
      if (open) throw Error("test_listener_not_closed");
    }
    child = undefined;
    closed = undefined;
    return code;
  }
  function suspend() {
    const owner = JSON.parse(readFileSync(`${database}.owner`, "utf8")) as { pid: number };
    if (!Number.isInteger(owner.pid) || owner.pid < 2) throw Error("test_owner_pid");
    suspendedPid = owner.pid;
    process.kill(owner.pid, "SIGSTOP");
  }
  async function dispose() {
    if (child) await stop("SIGTERM");
    rmSync(directory, { recursive: true, force: true });
  }
  return { root, backend, web, database, events, json, start, stop, suspend, resume, dispose };
}
