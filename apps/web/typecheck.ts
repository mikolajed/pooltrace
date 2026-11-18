import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { runtimeEnvironment } from "../backend/src/local-config.ts";
import { root, runNext } from "./next-process.ts";

function completed(child: ChildProcess) {
  return new Promise<number>((done) => {
    child.once("error", () => done(1));
    child.once("close", (code) => done(code ?? 1));
  });
}

const generated = await completed(runNext("typegen", {}));
process.exitCode =
  generated === 0
    ? await completed(
        spawn(
          process.execPath,
          [
            resolve(root, "node_modules/typescript/bin/tsc"),
            "-p",
            resolve(root, "apps/web"),
            "--incremental",
            "false",
          ],
          {
            cwd: root,
            env: { ...runtimeEnvironment(process.env), NODE_ENV: "production" },
            stdio: "inherit",
          },
        ),
      )
    : generated;
