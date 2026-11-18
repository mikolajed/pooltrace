import { fileURLToPath } from "node:url";
import { runCli } from "./cli-runner.ts";

const controller = new AbortController();
const interrupt = () => controller.abort();
process.on("SIGINT", interrupt);
try {
  const result = await runCli(process.argv.slice(2), {
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    env: process.env,
    signal: controller.signal,
  });
  process.stdout.write(`${result.stdout}\n`);
  process.exitCode = result.exitCode;
} finally {
  process.removeListener("SIGINT", interrupt);
}
