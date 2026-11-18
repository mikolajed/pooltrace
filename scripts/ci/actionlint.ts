import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sums: Record<string, string> = {
  linux_x64: "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8",
  linux_arm64: "325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6",
  darwin_arm64: "aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f",
};
const expected = sums[`${process.platform}_${process.arch}`];
if (!expected) throw Error("actionlint_platform_unsupported");
const architecture = process.arch === "x64" ? "amd64" : "arm64";
const archive = `actionlint_1.7.12_${process.platform}_${architecture}.tar.gz`;
const directory = mkdtempSync(join(tmpdir(), "pooltrace-actionlint-"));
try {
  const response = await fetch(
    `https://github.com/rhysd/actionlint/releases/download/v1.7.12/${archive}`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!response.ok) throw Error("actionlint_download");
  const data = Buffer.from(await response.arrayBuffer());
  if (
    data.length > 16 * 1024 * 1024 ||
    createHash("sha256").update(data).digest("hex") !== expected
  )
    throw Error("actionlint_integrity");
  writeFileSync(join(directory, archive), data, { mode: 0o600 });
  execFileSync("tar", ["-xzf", join(directory, archive), "-C", directory, "actionlint"]);
  execFileSync(join(directory, "actionlint"), ["-shellcheck=", ".github/workflows/ci.yml"], {
    stdio: "inherit",
  });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
