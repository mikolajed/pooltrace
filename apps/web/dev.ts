import { randomUUID } from "node:crypto";
import {
  LocalConfigError,
  loadEnvironment,
  parseLocalArgs,
  readPublicConfig,
} from "../backend/src/local-config.ts";
import { root, runNext } from "./next-process.ts";

try {
  const args = parseLocalArgs(process.argv.slice(2));
  if (args.help) process.stdout.write("Usage: bun run dev:web --mode live|fixture\n");
  else {
    const config = readPublicConfig(loadEnvironment(root, process.env), args.mode);
    const child = runNext(
      "dev",
      {
        POOLTRACE_API_ORIGIN: config.apiOrigin,
        POOLTRACE_WEB_PORT: String(config.webPort),
        POOLTRACE_BACKEND_PORT: String(config.backendPort),
        POOLTRACE_RUN_ID: config.runId,
        POOLTRACE_MODE: config.mode,
        POOLTRACE_INSTANCE_ID: randomUUID(),
      },
      config.webPort,
    );
    let code: number | undefined;
    const interrupt = () => {
      if (code === undefined) {
        code = 130;
        child.kill("SIGINT");
      }
    };
    const terminate = () => {
      if (code === undefined) {
        code = 143;
        child.kill("SIGTERM");
      }
    };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    try {
      process.exitCode = await new Promise<number>((resolve) => {
        child.once("error", () => resolve(1));
        child.once("close", (value) => resolve(code ?? value ?? 1));
      });
    } finally {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", terminate);
    }
  }
} catch (e) {
  process.stderr.write(
    `Pooltrace web: ${e instanceof LocalConfigError ? e.reason : "startup_failure"}\n`,
  );
  process.exitCode = e instanceof LocalConfigError ? 2 : 1;
}
