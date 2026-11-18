import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  type Environment,
  type LocalConfig,
  LocalConfigError,
  loadLocalConfig,
  parseLocalArgs,
  runtimeEnvironment,
} from "../../apps/backend/src/local-config.ts";

export const HELP =
  "Pooltrace local application\nUsage: bun run dev --mode live|fixture\n\nStarts the local backend and browser application. Ctrl-C stops owned processes.\n";
type Application = "backend" | "web";
type Reason =
  | "configuration"
  | "usage"
  | "platform_unsupported"
  | "spawn_failed"
  | "child_exited"
  | "readiness_invalid"
  | "readiness_timeout"
  | "cleanup_incomplete"
  | "cancelled";
export interface LaunchResult {
  exitCode: 0 | 1 | 2 | 130 | 143;
  reason: Reason | null;
}
export interface LauncherEvent {
  application?: Application;
  state: "starting" | "ready" | "stopping" | "stopped" | "failed";
  reason?: Reason;
  address?: string;
}
export interface LaunchOptions {
  root: string;
  env: Environment;
  signal?: AbortSignal;
  onEvent?: (event: LauncherEvent) => void;
  // Internal process-fixture seams, never command-line or environment configuration.
  entries?: Readonly<Record<Application, readonly string[]>>;
  timing?: Partial<typeof TIMING>;
  platform?: NodeJS.Platform;
}
const TIMING = {
  readinessMs: 60_000,
  probeMs: 250,
  requestMs: 1000,
  gracefulMs: 10_000,
  forceMs: 5000,
};
interface Owned {
  application: Application;
  process: ChildProcess;
  group: number | undefined;
  closed: boolean;
  exited: boolean;
  failed: boolean;
  released: boolean;
}

function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((done) => {
    if (signal?.aborted) {
      done();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      done();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });
}
function cancelled(signal?: AbortSignal): LaunchResult {
  return { exitCode: signal?.reason === "SIGTERM" ? 143 : 130, reason: "cancelled" };
}
function alive(owned: Owned) {
  if (owned.released || owned.group === undefined) return false;
  try {
    process.kill(-owned.group, 0);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH") {
      owned.released = true;
      return false;
    }
    return true;
  }
}
function signalGroup(owned: Owned, signal: NodeJS.Signals) {
  if (!alive(owned) || owned.group === undefined) return;
  try {
    process.kill(-owned.group, signal);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ESRCH")
      owned.released = true;
  }
}
function child(
  application: Application,
  args: readonly string[],
  root: string,
  env: Record<string, string>,
): Owned {
  const proc = spawn(process.execPath, [...args], {
    cwd: root,
    env,
    shell: false,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const owned: Owned = {
    application,
    process: proc,
    group: proc.pid,
    closed: false,
    exited: false,
    failed: false,
    released: false,
  };
  // Child output is deliberately drained without relaying paths, provider diagnostics or secrets.
  proc.stdout?.resume();
  proc.stderr?.resume();
  proc.on("error", () => {
    owned.failed = true;
  });
  proc.on("exit", () => {
    owned.exited = true;
  });
  proc.on("close", () => {
    owned.closed = true;
  });
  return owned;
}
export function childEnvironments(config: LocalConfig, runId: string) {
  const runtime = runtimeEnvironment(config.environment);
  const publicSettings = {
    POOLTRACE_BACKEND_PORT: String(config.backendPort),
    POOLTRACE_WEB_PORT: String(config.webPort),
    POOLTRACE_API_ORIGIN: config.apiOrigin,
    POOLTRACE_RUN_ID: runId,
  };
  return {
    backend: {
      ...runtime,
      ...publicSettings,
      ETHEREUM_RPC_URL: config.rpc.rpcUrl,
      RPC_PROVIDER_LABEL: config.rpc.providerLabel,
      RPC_CONFIG_REVISION: config.rpc.configurationRevision,
      USDC_INPUT_AMOUNTS: JSON.stringify(config.sizes),
      POOLTRACE_DB_PATH: config.dbPath,
      POOLTRACE_COLLECTION_DELAY_MS: String(config.delayMs),
    },
    web: { ...runtime, ...publicSettings },
  };
}

type Probe = { kind: "waiting" } | { kind: "invalid" } | { kind: "ready"; instanceId: string };
function get(
  address: string,
  timeout: number,
  signal?: AbortSignal,
  rootPage = false,
): Promise<Probe> {
  return new Promise((done) => {
    let settled = false;
    const finish = (value: Probe) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        done(value);
      }
    };
    const req = request(
      address,
      { method: "GET", signal, headers: { "Cache-Control": "no-cache" } },
      (res) => {
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (part: Buffer) => {
          size += part.length;
          if (size > (rootPage ? 1024 * 1024 : 4096)) {
            finish({ kind: "invalid" });
            req.destroy();
          } else if (!rootPage) chunks.push(part);
        });
        res.on("error", () => finish({ kind: "waiting" }));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            finish({ kind: res.statusCode === 503 ? "waiting" : "invalid" });
            return;
          }
          if (rootPage) {
            finish({ kind: "ready", instanceId: "root" });
            return;
          }
          try {
            const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (!value || typeof value !== "object" || Array.isArray(value)) {
              finish({ kind: "invalid" });
              return;
            }
            const fields = value as Record<string, unknown>;
            if (
              Object.keys(fields).length !== 5 ||
              fields.contractVersion !== "local-process-v1" ||
              fields.phase !== "ready" ||
              typeof fields.application !== "string" ||
              typeof fields.runId !== "string" ||
              typeof fields.instanceId !== "string" ||
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                fields.instanceId,
              )
            ) {
              finish({ kind: "invalid" });
              return;
            }
            finish({ kind: "ready", instanceId: JSON.stringify(fields) });
          } catch {
            finish({ kind: "invalid" });
          }
        });
      },
    );
    req.on("error", () => finish({ kind: "waiting" }));
    const timer = setTimeout(
      () => {
        finish({ kind: "waiting" });
        req.destroy();
      },
      Math.max(1, timeout),
    );
    req.end();
  });
}
async function readiness(
  owned: Owned,
  address: string,
  runId: string,
  signal: AbortSignal | undefined,
  timing: typeof TIMING,
  children: readonly Owned[],
) {
  const deadline = performance.now() + timing.readinessMs;
  while (performance.now() < deadline) {
    if (signal?.aborted) return "cancelled" as const;
    if (children.some((item) => item.failed)) return "spawn_failed" as const;
    if (children.some((item) => item.exited || item.closed)) return "child_exited" as const;
    const status = await get(
      `${address}/healthz`,
      Math.min(timing.requestMs, deadline - performance.now()),
      signal,
    );
    if (signal?.aborted) return "cancelled" as const;
    if (children.some((item) => item.failed)) return "spawn_failed" as const;
    if (children.some((item) => item.exited || item.closed)) return "child_exited" as const;
    if (status.kind === "invalid") return "readiness_invalid" as const;
    if (status.kind === "ready") {
      const fields = JSON.parse(status.instanceId) as Record<string, unknown>;
      if (fields.application !== owned.application || fields.runId !== runId)
        return "readiness_invalid" as const;
      if (owned.application === "web") {
        const page = await get(
          `${address}/`,
          Math.min(timing.requestMs, Math.max(1, deadline - performance.now())),
          signal,
          true,
        );
        if (signal?.aborted) return "cancelled" as const;
        if (page.kind === "invalid") return "readiness_invalid" as const;
        if (page.kind !== "ready") {
          await pause(Math.min(timing.probeMs, Math.max(1, deadline - performance.now())), signal);
          continue;
        }
      }
      if (!owned.exited && !owned.closed && !owned.failed && performance.now() < deadline)
        return null;
    }
    await pause(Math.min(timing.probeMs, Math.max(1, deadline - performance.now())), signal);
  }
  return "readiness_timeout" as const;
}
async function cleanup(children: readonly Owned[], timing: typeof TIMING, signal: NodeJS.Signals) {
  for (const owned of [...children].reverse()) signalGroup(owned, signal);
  let deadline = performance.now() + timing.gracefulMs;
  while (performance.now() < deadline && children.some((owned) => !owned.closed || alive(owned)))
    await pause(25);
  for (const owned of [...children].reverse()) signalGroup(owned, "SIGKILL");
  deadline = performance.now() + timing.forceMs;
  while (performance.now() < deadline && children.some((owned) => !owned.closed || alive(owned)))
    await pause(25);
  return children.every((owned) => owned.closed && !alive(owned));
}

export async function runLocal(
  args: readonly string[],
  options: LaunchOptions,
): Promise<LaunchResult> {
  let config: LocalConfig;
  try {
    const parsed = parseLocalArgs(args);
    if (parsed.help) return { exitCode: 0, reason: null };
    config = loadLocalConfig(options.root, options.env, parsed.mode);
  } catch (error) {
    return {
      exitCode: 2,
      reason:
        error instanceof LocalConfigError && error.reason === "usage" ? "usage" : "configuration",
    };
  }
  if (!["darwin", "linux"].includes(options.platform ?? process.platform))
    return { exitCode: 1, reason: "platform_unsupported" };
  if (options.signal?.aborted) return cancelled(options.signal);
  const timing = { ...TIMING, ...options.timing };
  const runId = randomUUID();
  const environments = childEnvironments(config, runId);
  const root = resolve(options.root);
  const entries = options.entries ?? {
    backend: [resolve(root, "apps/backend/src/server.ts"), "--mode", config.mode],
    web: [resolve(root, "apps/web/dev.ts"), "--mode", config.mode],
  };
  const children: Owned[] = [];
  const emit = (event: LauncherEvent) => {
    try {
      options.onEvent?.(event);
    } catch {
      /* Observers cannot interrupt owned cleanup. */
    }
  };
  let result: LaunchResult = { exitCode: 1, reason: "child_exited" };
  try {
    for (const application of ["backend", "web"] as const) {
      if (options.signal?.aborted) {
        result = cancelled(options.signal);
        break;
      }
      emit({ application, state: "starting" });
      const owned = child(application, entries[application], root, environments[application]);
      children.push(owned);
      const address = application === "backend" ? config.apiOrigin : config.webOrigin;
      const reason = await readiness(owned, address, runId, options.signal, timing, children);
      if (reason) {
        result = reason === "cancelled" ? cancelled(options.signal) : { exitCode: 1, reason };
        emit({ application, state: "failed", reason });
        break;
      }
      emit({ application, state: "ready", address });
    }
    if (
      children.length === 2 &&
      children.every((owned) => !owned.exited && !owned.closed && !owned.failed) &&
      result.reason === "child_exited"
    ) {
      while (
        !options.signal?.aborted &&
        children.every((owned) => !owned.exited && !owned.closed && !owned.failed)
      )
        await pause(25, options.signal);
      result = options.signal?.aborted
        ? cancelled(options.signal)
        : {
            exitCode: 1,
            reason: children.some((owned) => owned.failed) ? "spawn_failed" : "child_exited",
          };
    }
  } catch {
    result = { exitCode: 1, reason: "spawn_failed" };
  } finally {
    emit({ state: "stopping" });
    if (
      !(await cleanup(children, timing, options.signal?.reason === "SIGINT" ? "SIGINT" : "SIGTERM"))
    ) {
      result = { exitCode: 1, reason: "cleanup_incomplete" };
      emit({ state: "failed", reason: "cleanup_incomplete" });
    } else emit({ state: "stopped" });
  }
  return result;
}
