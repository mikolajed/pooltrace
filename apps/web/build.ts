import { runNext } from "./next-process.ts";

const child = runNext("build", {});
process.exitCode = await new Promise<number>((resolve) => {
  child.once("error", () => resolve(1));
  child.once("close", (code) => resolve(code ?? 1));
});
