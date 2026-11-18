import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs, parseEnv } from "node:util";
import { parseSizes } from "@pooltrace/domain";

export type Mode = "live" | "fixture";
export type Environment = Readonly<Record<string, string | undefined>>;
export class LocalConfigError extends Error {
  readonly reason: "usage" | "configuration" | "environment" | "size_configuration";
  constructor(reason: LocalConfigError["reason"]) {
    super(reason);
    this.reason = reason;
  }
}
export function parseLocalArgs(args: readonly string[]) {
  try {
    const parsed = parseArgs({
      args: [...args],
      strict: true,
      allowPositionals: false,
      tokens: true,
      options: { mode: { type: "string" }, help: { type: "boolean", short: "h" } },
    });
    const seen = new Set<string>();
    for (const token of parsed.tokens)
      if (token.kind === "option") {
        if (seen.has(token.name)) throw new LocalConfigError("usage");
        seen.add(token.name);
      }
    if (parsed.values.help) {
      if (parsed.values.mode !== undefined) throw new LocalConfigError("usage");
      return { help: true, mode: null } as const;
    }
    if (parsed.values.mode !== "live" && parsed.values.mode !== "fixture")
      throw new LocalConfigError("usage");
    return { help: false, mode: parsed.values.mode } as const;
  } catch {
    throw new LocalConfigError("usage");
  }
}
export function loadEnvironment(root: string, env: Environment): Environment {
  const local: Record<string, string | undefined> = {};
  try {
    for (const name of [".env", ".env.local"]) {
      try {
        Object.assign(local, parseEnv(readFileSync(resolve(root, name), "utf8")));
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT")
          throw error;
      }
    }
  } catch {
    throw new LocalConfigError("environment");
  }
  return {
    ...local,
    ...Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined)),
  };
}
function integer(raw: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (raw === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(raw)) throw new LocalConfigError("configuration");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new LocalConfigError("configuration");
  return value;
}
export function readPublicConfig(env: Environment, mode: Mode) {
  const backendPort = integer(env.POOLTRACE_BACKEND_PORT, 4317, 1024, 65535);
  const webPort = integer(env.POOLTRACE_WEB_PORT, 4318, 1024, 65535);
  if (backendPort === webPort) throw new LocalConfigError("configuration");
  const apiOrigin = `http://127.0.0.1:${backendPort}`;
  if (env.POOLTRACE_API_ORIGIN !== undefined && env.POOLTRACE_API_ORIGIN !== apiOrigin)
    throw new LocalConfigError("configuration");
  const runId = env.POOLTRACE_RUN_ID ?? randomUUID();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    throw new LocalConfigError("configuration");
  return { mode, backendPort, webPort, apiOrigin, webOrigin: `http://127.0.0.1:${webPort}`, runId };
}
export function loadLocalConfig(root: string, env: Environment, mode: Mode) {
  const environment = loadEnvironment(root, env);
  const settings = readPublicConfig(environment, mode);
  const delayMs = integer(environment.POOLTRACE_COLLECTION_DELAY_MS, 10000, 1000, 300000);
  let sizes: readonly string[];
  try {
    const parsed: unknown =
      environment.USDC_INPUT_AMOUNTS === undefined
        ? undefined
        : JSON.parse(environment.USDC_INPUT_AMOUNTS);
    if (
      parsed !== undefined &&
      (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string"))
    )
      throw new Error();
    sizes = parseSizes(parsed as readonly string[] | undefined).map((value) => {
      const fraction = (value % 1000000n).toString().padStart(6, "0").replace(/0+$/, "");
      return `${value / 1000000n}${fraction ? `.${fraction}` : ""}`;
    });
  } catch {
    throw new LocalConfigError("size_configuration");
  }
  const raw = environment.POOLTRACE_DB_PATH;
  if (
    raw !== undefined &&
    (!raw ||
      raw.trim() !== raw ||
      raw.includes("\0") ||
      raw === ":memory:" ||
      /^[a-z][a-z0-9+.-]*:/i.test(raw))
  )
    throw new LocalConfigError("configuration");
  const dbPath = resolve(
    root,
    raw ?? `data/pooltrace${mode === "fixture" ? "-fixture" : ""}.sqlite`,
  );
  const rpc =
    mode === "fixture"
      ? {
          rpcUrl: "https://fixture.invalid",
          providerLabel: "constructed-fixture",
          configurationRevision: "diagnostic-fixture-v1",
        }
      : {
          rpcUrl: environment.ETHEREUM_RPC_URL?.trim() ?? "",
          providerLabel: environment.RPC_PROVIDER_LABEL?.trim() || "alchemy-ethereum",
          configurationRevision: environment.RPC_CONFIG_REVISION?.trim() || "alchemy-ethereum-v1",
        };
  try {
    const url = new URL(rpc.rpcUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(rpc.providerLabel) ||
      !/^[a-z][a-z0-9_-]{0,63}$/.test(rpc.configurationRevision)
    )
      throw new Error();
  } catch {
    throw new LocalConfigError("configuration");
  }
  return { ...settings, delayMs, dbPath, rpc, sizes, environment };
}
export type LocalConfig = ReturnType<typeof loadLocalConfig>;
export function runtimeEnvironment(env: Environment) {
  return Object.fromEntries(
    [
      "PATH",
      "HOME",
      "TMPDIR",
      "TEMP",
      "TMP",
      "LANG",
      "LC_ALL",
      "TERM",
      "NO_COLOR",
      "FORCE_COLOR",
      "NEXT_TELEMETRY_DISABLED",
    ].flatMap((key) => (env[key] === undefined ? [] : [[key, env[key] as string]])),
  );
}
