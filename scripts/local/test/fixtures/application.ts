import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const application = process.argv[2];
const spec = JSON.parse(process.argv[3] ?? "{}") as {
  report?: string;
  signals?: string;
  delay?: number;
  wrong?: string;
  exitAfter?: number;
  exitBefore?: boolean;
  malformed?: boolean;
  oversize?: boolean;
  noReady?: boolean;
  ignoreSignals?: boolean;
  descendant?: string;
  noisy?: string;
  rootStatus?: number;
};
if (spec.exitBefore) process.exit(1);
const instanceId = randomUUID();
if (spec.report) writeFileSync(spec.report, JSON.stringify({ pid: process.pid, env: process.env }));
if (spec.noisy) {
  process.stdout.write(spec.noisy);
  process.stderr.write(spec.noisy);
}
if (spec.descendant) {
  const nested = spawn(
    process.execPath,
    ["-e", "process.on('SIGTERM',()=>{});process.on('SIGINT',()=>{});setInterval(()=>{},1000)"],
    { stdio: "ignore" },
  );
  writeFileSync(spec.descendant, String(nested.pid));
}
const readyAt = performance.now() + (spec.delay ?? 0);
const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    if (spec.noReady || performance.now() < readyAt) {
      res.writeHead(503);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    if (spec.malformed) {
      res.end("{");
      return;
    }
    if (spec.oversize) {
      res.end("x".repeat(8192));
      return;
    }
    const body: Record<string, string> = {
      contractVersion: "local-process-v1",
      application: application ?? "",
      runId: process.env.POOLTRACE_RUN_ID ?? "",
      instanceId,
      phase: "ready",
    };
    if (spec.wrong === "role") body.application = "other";
    if (spec.wrong === "run") body.runId = randomUUID();
    if (spec.wrong === "version") body.contractVersion = "other";
    if (spec.wrong === "instance") body.instanceId = "invalid";
    res.end(JSON.stringify(body));
  } else {
    res.writeHead(spec.rootStatus ?? 200);
    res.end("application root");
  }
});
server.on("error", () => process.exit(1));
const port = Number(
  application === "backend" ? process.env.POOLTRACE_BACKEND_PORT : process.env.POOLTRACE_WEB_PORT,
);
server.listen(port, "127.0.0.1", () => {
  if (spec.exitAfter !== undefined) setTimeout(() => process.exit(1), spec.exitAfter);
});
for (const name of ["SIGINT", "SIGTERM"] as const)
  process.on(name, () => {
    if (spec.signals) appendFileSync(spec.signals, `${name}\n`);
    if (!spec.ignoreSignals) server.close(() => process.exit(0));
  });
