import { fileURLToPath } from "node:url";
import { HELP, runLocal } from "./launcher.ts";

const controller = new AbortController();
const interrupt = () => controller.abort("SIGINT");
const terminate = () => controller.abort("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
try {
  const result = await runLocal(process.argv.slice(2), {
    root: fileURLToPath(new URL("../../", import.meta.url)),
    env: process.env,
    signal: controller.signal,
    onEvent(event) {
      const label = event.application ? ` ${event.application}` : "";
      const detail = event.address ?? event.reason;
      process.stdout.write(`Pooltrace${label}: ${event.state}${detail ? ` (${detail})` : ""}\n`);
    },
  });
  if (result.exitCode === 0) process.stdout.write(HELP);
  else if (result.reason !== "cancelled") process.stderr.write(`Pooltrace: ${result.reason}\n`);
  process.exitCode = result.exitCode;
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", terminate);
}
