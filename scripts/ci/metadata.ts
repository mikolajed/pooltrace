import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(new URL("../../apps/backend/package.json", import.meta.url));
const Database = require("better-sqlite3");
const db = new Database(":memory:");
const sqlite = db.prepare("SELECT sqlite_version() version").get().version as string;
db.close();
const safe = (value: string | undefined) =>
  value && /^[\w. /:-]{1,160}$/.test(value) ? value : null;
const sha = (value: string | undefined) => (value && /^[0-9a-f]{40}$/.test(value) ? value : null);
const testedSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const workspaceDirty =
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).length > 0;
if (process.env.GITHUB_SHA && (testedSha !== process.env.GITHUB_SHA || workspaceDirty))
  throw Error("ci_checkout_identity");
const source = createHash("sha256");
const files = execFileSync("git", ["ls-files", "-c", "-o", "--exclude-standard"], {
  encoding: "utf8",
});
for (const name of [...new Set(files.trim().split("\n"))].sort()) {
  if (
    !/^(apps\/|packages\/|scripts\/|\.github\/|[^/]+\.(json|ts)$|bun\.lock$|\.node-version$|\.bun-version$|\.gitignore$)/.test(
      name,
    )
  )
    continue;
  source.update(name);
  source.update("\0");
  source.update(readFileSync(name));
}
const report = {
  formatVersion: "ci-candidate-v1",
  recordedAt: new Date().toISOString(),
  event: safe(process.env.GITHUB_EVENT_NAME),
  headSha: sha(process.env.CI_HEAD_SHA),
  baseSha: sha(process.env.CI_BASE_SHA),
  testedSha,
  workspaceDirty,
  sourceDigestSha256: source.digest("hex"),
  job: safe(process.env.GITHUB_JOB),
  runner: {
    os: process.platform,
    arch: process.arch,
    image: safe(process.env.ImageOS),
    imageVersion: safe(process.env.ImageVersion),
  },
  runtime: {
    node: process.versions.node,
    bun: execFileSync("bun", ["--version"], { encoding: "utf8" }).trim(),
    driver: require("better-sqlite3/package.json").version as string,
    sqlite,
  },
  lockfileSha256: createHash("sha256").update(readFileSync("bun.lock")).digest("hex"),
};
mkdirSync("ci-results", { recursive: true });
const name = /^[a-z-]+$/.test(process.env.GITHUB_JOB ?? "") ? process.env.GITHUB_JOB : "local";
writeFileSync(resolve("ci-results", `${name}.json`), `${JSON.stringify(report, null, 2)}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Candidate metadata\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`,
  );
console.log(JSON.stringify(report));
