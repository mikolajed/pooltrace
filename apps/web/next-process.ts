import { type ChildProcess, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Environment, runtimeEnvironment } from "../backend/src/local-config.ts";
export const root = fileURLToPath(new URL("../../", import.meta.url));
export function runNext(
  command: "dev" | "build" | "typegen",
  env: Environment,
  port?: number,
): ChildProcess {
  const require = createRequire(new URL("./package.json", import.meta.url));
  const cli = resolve(dirname(require.resolve("next/package.json")), "dist/bin/next");
  return spawn(
    process.execPath,
    [
      cli,
      command,
      resolve(root, "apps/web"),
      ...(command === "dev" ? ["--hostname", "127.0.0.1", "--port", String(port)] : []),
    ],
    {
      cwd: root,
      env: {
        ...runtimeEnvironment(process.env),
        ...env,
        NEXT_TELEMETRY_DISABLED: "1",
        NODE_ENV: command === "dev" ? "development" : "production",
      },
      stdio: "inherit",
    },
  );
}
