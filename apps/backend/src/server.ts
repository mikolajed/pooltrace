import { fileURLToPath } from "node:url";
import { LocalConfigError, loadLocalConfig, parseLocalArgs } from "./local-config.ts";
import { startService } from "./service.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let service: Awaited<ReturnType<typeof startService>> | undefined;
let signalCode: number | undefined;
const stop = (code: number) => {
  signalCode ??= code;
  void service?.stop().catch(() => {
    process.exitCode = 1;
  });
};
const interrupt = () => stop(130),
  terminate = () => stop(143);
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
try {
  const args = parseLocalArgs(process.argv.slice(2));
  if (args.help) process.stdout.write("Usage: bun run dev:backend --mode live|fixture\n");
  else {
    const config = loadLocalConfig(root, process.env, args.mode);
    service = await startService(config);
    if (signalCode !== undefined) await service.stop();
    else {
      process.stdout.write(`Pooltrace backend listening at ${config.apiOrigin}\n`);
      await Promise.race([
        service.failure,
        new Promise<void>((resolve) => {
          process.once("SIGINT", resolve);
          process.once("SIGTERM", resolve);
        }),
      ]);
      await service.stop();
    }
    process.exitCode = signalCode ?? 1;
  }
} catch (e) {
  process.stderr.write(
    `Pooltrace backend: ${e instanceof LocalConfigError ? e.reason : "startup_or_runtime_failure"}\n`,
  );
  process.exitCode = signalCode ?? (e instanceof LocalConfigError ? 2 : 1);
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", terminate);
}
