import { randomUUID } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { type Clock, jsonEvidence, POLICY, systemClock } from "@pooltrace/protocols";
import { analysisEligibility } from "./analysis.ts";
import { type CliEnvelope, runCli } from "./cli-runner.ts";
import type { LocalConfig } from "./local-config.ts";
import { acquireProducer } from "./producer-guard.ts";
import { StorageError } from "./storage/driver.ts";
import { EvidenceStore, type ListOptions } from "./storage/store.ts";

function eventData(value: unknown) {
  return jsonEvidence(value)
    .split("\n")
    .map((line) => `data: ${line}`)
    .join("\n");
}

export function writeStatusFrame(response: ServerResponse, body: string) {
  if (response.destroyed || response.writableLength + Buffer.byteLength(body) > 128 * 1024) {
    response.destroy();
    return;
  }
  if (!response.write(body)) {
    const timeout = setTimeout(() => response.destroy(), 5000);
    const cleanup = () => {
      clearTimeout(timeout);
      response.removeListener("close", cleanup);
      response.removeListener("drain", cleanup);
    };
    response.once("drain", cleanup);
    response.once("close", cleanup);
  }
}

export async function startService(config: LocalConfig, options: { clock?: Clock } = {}) {
  const clock = options.clock ?? systemClock;
  const instanceId = randomUUID(),
    controller = new AbortController(),
    guard = acquireProducer(config.dbPath);
  let store: EvidenceStore;
  try {
    store = new EvidenceStore(guard.dbPath);
  } catch (e) {
    guard.release();
    throw e;
  }
  let phase: "ready" | "stopping" = "ready",
    collector = "idle",
    last: CliEnvelope | null = null,
    sequence = 0,
    attempts = 0;
  const clients = new Set<ServerResponse>();
  const sockets = new Set<import("node:net").Socket>();
  let fatal: (() => void) | undefined;
  const failure = new Promise<void>((resolve) => {
    fatal = resolve;
  });
  function current() {
    guard.assertOwned();
    const analysis = last?.analysis;
    let state = analysis ? analysisEligibility(analysis, clock) : null;
    const witness = analysis ? store.knownInvalidation(analysis.observation.attemptId) : null;
    const saved = last?.persistence.status === "saved" && store.available;
    if (state && (!saved || witness || phase !== "ready"))
      state = {
        ...state,
        canonical: witness ? "invalidated" : state.canonical,
        best: null,
        workloadAdmitted: false,
        eligibleForLiveQualification: false,
      };
    const validation = analysis?.observation.validations.at(-1);
    let validForMs =
      state?.best && validation
        ? Math.max(0, POLICY.maxValidationAgeMs - (clock.mono() - validation.monotonicAt))
        : 0;
    if (analysis?.observation.origin === "live" && analysis.observation.block)
      validForMs = Math.min(
        validForMs,
        Math.max(
          0,
          POLICY.maxBlockAgeMs -
            (clock.wall() - Number(analysis.observation.block.timestamp * 1000n)),
        ),
      );
    return {
      apiVersion: "local-api-v1",
      instanceId,
      sequence,
      asOf: clock.wall(),
      mode: config.mode,
      collector,
      attempts,
      phase,
      validForMs,
      result: last
        ? {
            ...last,
            recordedStatus: last.status,
            status:
              state?.canonical === "invalidated"
                ? "invalidated"
                : state?.validationExpired || state?.freshness === "stale"
                  ? "stale"
                  : state?.best
                    ? last.status
                    : "unavailable",
            eligibility: state,
            persistence: { ...last.persistence, knownInvalidation: witness },
          }
        : null,
    };
  }
  function status() {
    const view = current();
    return {
      apiVersion: view.apiVersion,
      instanceId,
      sequence,
      asOf: view.asOf,
      mode: config.mode,
      collector,
      attempts,
      phase,
      validForMs: view.validForMs,
      analysisId: view.result?.analysis?.attemptId ?? null,
      persistence: view.result?.persistence ?? null,
      eligibility: view.result?.eligibility ?? null,
    };
  }
  function publish() {
    sequence++;
    let body: string;
    try {
      body = `id: ${instanceId}:${sequence}\nevent: status\n${eventData(status())}\n\n`;
    } catch {
      phase = "stopping";
      controller.abort();
      fatal?.();
      return;
    }
    if (Buffer.byteLength(body) > 64 * 1024) {
      for (const client of clients) client.destroy();
      return;
    }
    for (const client of clients) if (!client.writableNeedDrain) writeStatusFrame(client, body);
  }
  function send(response: ServerResponse, code: number, value: unknown) {
    const body = jsonEvidence(value);
    if (Buffer.byteLength(body) > 16 * 1024 * 1024) {
      response.writeHead(503);
      response.end('{"reason":"capacity"}');
      return;
    }
    response.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    response.end(body);
  }
  const server = createServer(
    { maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 },
    (request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Vary", "Origin");
      if (
        request.headers.host !== `127.0.0.1:${config.backendPort}` ||
        (request.headers.origin !== undefined && request.headers.origin !== config.webOrigin)
      ) {
        send(response, 400, { reason: "request_origin" });
        return;
      }
      if (request.headers.origin)
        response.setHeader("Access-Control-Allow-Origin", config.webOrigin);
      if (request.method !== "GET") {
        send(response, 405, { reason: "method" });
        return;
      }
      if (!request.url || request.url.length > 4096) {
        send(response, 400, { reason: "request" });
        return;
      }
      try {
        const url = new URL(request.url, config.apiOrigin);
        if (url.pathname === "/healthz" && !url.search) {
          send(response, phase === "ready" ? 200 : 503, {
            contractVersion: "local-process-v1",
            application: "backend",
            runId: config.runId,
            instanceId,
            phase,
          });
          return;
        }
        if (phase !== "ready") {
          send(response, 503, { reason: "stopping" });
          return;
        }
        if (url.pathname === "/api/v1/current" && !url.search) {
          send(response, 200, current());
          return;
        }
        if (url.pathname === "/api/v1/events" && !url.search) {
          if (clients.size >= 16) {
            send(response, 503, { reason: "capacity" });
            return;
          }
          response.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            Connection: "keep-alive",
          });
          response.flushHeaders();
          clients.add(response);
          response.on("close", () => clients.delete(response));
          writeStatusFrame(
            response,
            `retry: 1000\nid: ${instanceId}:${sequence}\nevent: status\n${eventData(status())}\n\n`,
          );
          return;
        }
        const list = /^\/api\/v1\/history\/(observations|analyses)$/.exec(url.pathname);
        if (list) {
          const opts: ListOptions = {},
            seen = new Set<string>();
          for (const [key, value] of url.searchParams) {
            if (
              seen.has(key) ||
              !["limit", "origin", "observationId", "highWater", "lastSeq"].includes(key)
            )
              throw new Error();
            seen.add(key);
            if (key === "limit") {
              if (!/^[1-9][0-9]{0,2}$/.test(value)) throw new Error();
              opts.limit = Number(value);
            }
            if (key === "origin") {
              if (!["live", "fixture", "historical"].includes(value)) throw new Error();
              opts.origin = value as "live" | "fixture" | "historical";
            }
            if (key === "observationId") {
              if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error();
              opts.observationId = value;
            }
          }
          if (seen.has("highWater") !== seen.has("lastSeq")) throw new Error();
          if (seen.has("highWater"))
            opts.cursor = {
              highWater: url.searchParams.get("highWater") ?? "",
              lastSeq: url.searchParams.get("lastSeq") ?? "",
            };
          send(response, 200, {
            apiVersion: "local-api-v1",
            instanceId,
            asOf: Date.now(),
            context: "historical",
            ...store.list(list[1] as "observations" | "analyses", opts),
          });
          return;
        }
        const detail = /^\/api\/v1\/history\/(observations|analyses)\/([0-9a-f]{64})$/.exec(
          url.pathname,
        );
        if (detail && !url.search) {
          const value = store.findVersion(
            detail[1] as "observations" | "analyses",
            detail[2] as string,
          );
          if (!value) {
            send(response, 404, { reason: "not_found" });
            return;
          }
          send(response, 200, {
            apiVersion: "local-api-v1",
            instanceId,
            asOf: Date.now(),
            ...value,
          });
          return;
        }
        send(response, 404, { reason: "not_found" });
      } catch (e) {
        if (e instanceof StorageError)
          send(response, e.reason === "storage_configuration" ? 400 : 503, { reason: e.reason });
        else send(response, 400, { reason: "request" });
      }
    },
  );
  server.maxConnections = 64;
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.backendPort, "127.0.0.1", resolve);
    });
  } catch (e) {
    store.close();
    guard.release();
    throw e;
  }
  const ticker = setInterval(publish, 1000);
  const loop = (async () => {
    while (!controller.signal.aborted) {
      collector = "collecting";
      attempts++;
      publish();
      const result = await runCli(
        ["--mode", config.mode, "--format", "json", "--sizes", JSON.stringify(config.sizes)],
        {
          root: "",
          readFile: () => undefined,
          clock,
          env: { ...config.environment, POOLTRACE_DB_PATH: guard.dbPath },
          persistentStore: store,
          producerGuard: guard,
          signal: controller.signal,
        },
      );
      last = result.envelope;
      collector = "idle";
      if (
        !store.available ||
        last?.reason === "producer_unavailable" ||
        (last?.persistence.reason &&
          ["storage_corrupt", "storage_io", "storage_unavailable", "storage_full"].includes(
            last.persistence.reason,
          ))
      ) {
        phase = "stopping";
        controller.abort();
        fatal?.();
      }
      publish();
      try {
        await delay(config.delayMs, undefined, { signal: controller.signal });
      } catch {
        break;
      }
    }
  })().catch(() => {
    phase = "stopping";
    controller.abort();
    fatal?.();
  });
  let stopped: Promise<void> | undefined;
  function stop() {
    if (stopped) return stopped;
    phase = "stopping";
    controller.abort();
    clearInterval(ticker);
    for (const response of clients) response.end();
    const closed = new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    for (const socket of sockets) socket.destroy();
    stopped = (async () => {
      await loop;
      await closed;
      store.close();
      guard.release();
    })();
    return stopped;
  }
  return { instanceId, current, stop, failure, server };
}
