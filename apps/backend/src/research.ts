import { writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { jsonEvidence, safeReason } from "@pooltrace/protocols";
import { ResearchError } from "./research/model.ts";
import { buildReport, reportMarkdown } from "./research/report.ts";
import { runExperiment } from "./research/runner.ts";

const HELP = `ARB-01 — independent baseline yield and collector freshness
Usage: bun run research:arb-01 run [--output-dir PATH]
       bun run research:arb-01 continue --run-dir PATH [--output-dir PATH]
       bun run research:arb-01 report --run-dir PATH
       bun run research:arb-01 --help

Run is live read-only Ethereum observation, using private root .env/.env.local/process settings.
The fixed workload is three pools and six sizes. Two 128-block windows are capped at 45 minutes
and 20,000 RPC sends each, plus preflight (2 minutes / 300 sends). No extra windows or fallback.
Output defaults to a new private data/arb-01-<id> directory with dedicated SQLite and timing journal.
Report validates the retained evidence offline and writes report.json and report.md in that run directory.
Continue accepts only a fully reconciled first window with verified post-interruption source proof.
It writes a new linked directory and runs only window 2 within the original remaining budgets.
SIGINT/SIGTERM cancel owned work and retain partial evidence. Costs/net remain unavailable.
Exit: 0 completed run/report; 1 incomplete/runtime/evidence failure; 2 usage/configuration; 130 interrupted.`;
const controller = new AbortController();
const interrupt = () => controller.abort();
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
try {
  const args = process.argv.slice(2);
  const parsed = (() => {
    try {
      return parseArgs({
        args,
        strict: true,
        allowPositionals: true,
        tokens: true,
        options: {
          help: { type: "boolean", short: "h" },
          "output-dir": { type: "string" },
          "run-dir": { type: "string" },
        },
      });
    } catch {
      throw new ResearchError("usage");
    }
  })();
  const seen = new Set<string>();
  for (const token of parsed.tokens)
    if (token.kind === "option") {
      if (seen.has(token.name)) throw new ResearchError("usage");
      seen.add(token.name);
    }
  const [command] = parsed.positionals;
  for (const value of [parsed.values["output-dir"], parsed.values["run-dir"]])
    if (value !== undefined && (!value || value.trim() !== value || value.includes("\0")))
      throw new ResearchError("usage");
  if (parsed.values.help && args.length === 1) process.stdout.write(`${HELP}\n`);
  else if (
    (command === "run" || command === "continue") &&
    parsed.positionals.length === 1 &&
    !parsed.values.help &&
    (command === "continue"
      ? parsed.values["run-dir"] !== undefined
      : parsed.values["run-dir"] === undefined)
  ) {
    const result = await runExperiment({
      root: fileURLToPath(new URL("../../../", import.meta.url)),
      env: process.env,
      ...(parsed.values["output-dir"] ? { outputDir: parsed.values["output-dir"] } : {}),
      ...(command === "continue" && parsed.values["run-dir"]
        ? { continueFrom: parsed.values["run-dir"] }
        : {}),
      signal: controller.signal,
      progress: (value) => process.stdout.write(`${JSON.stringify(value)}\n`),
    });
    process.exitCode = controller.signal.aborted ? 130 : result.reason === "complete" ? 0 : 1;
  } else if (
    command === "report" &&
    parsed.positionals.length === 1 &&
    parsed.values["run-dir"] &&
    !parsed.values.help &&
    !parsed.values["output-dir"]
  ) {
    const directory = resolve(parsed.values["run-dir"]);
    const report = buildReport(directory);
    writeFileSync(join(directory, "report.json"), `${jsonEvidence(report)}\n`, { mode: 0o600 });
    writeFileSync(join(directory, "report.md"), reportMarkdown(report), { mode: 0o600 });
    process.stdout.write(
      `${JSON.stringify({ report: join(directory, "report.json"), origin: report.origin, complete: report.complete, conclusion: report.conclusion })}\n`,
    );
  } else throw new ResearchError("usage");
} catch (error) {
  const reason = error instanceof ResearchError ? error.reason : safeReason(error);
  process.stderr.write(`${JSON.stringify({ status: "failed", reason })}\n`);
  process.exitCode = controller.signal.aborted
    ? 130
    : reason === "usage" || reason === "configuration"
      ? 2
      : 1;
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
