import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseDocument } from "yaml";
import { requiredJobs } from "./contract.ts";

const pins = new Set([
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1",
  "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6",
  "actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9",
]);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("workflow_contract");
  return value as Record<string, unknown>;
}
function same(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw Error("workflow_contract");
}

export function checkWorkflow(source: string) {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw Error("workflow_yaml");
  const workflow = object(document.toJS({ maxAliasCount: 0 }));
  same(workflow.permissions, { contents: "read" });
  const events = object(workflow.on);
  same(Object.keys(events).sort(), ["pull_request", "push", "workflow_dispatch"]);
  same(events.pull_request, {
    branches: ["main"],
    types: ["opened", "synchronize", "reopened", "ready_for_review"],
  });
  same(events.push, { branches: ["main"] });
  same(events.workflow_dispatch, {});
  same(workflow.concurrency, {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: This is literal GitHub Actions syntax.
    group: "pr-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}",
    "cancel-in-progress": true,
  });
  const jobs = object(workflow.jobs);
  same(Object.keys(jobs).sort(), [...requiredJobs, "pr-gate"].sort());
  if (/secrets\s*(?:\.|\[)|pull_request_target|workflow_run/.test(source))
    throw Error("workflow_privilege");
  for (const [name, value] of Object.entries(jobs)) {
    const job = object(value);
    if (job.permissions || job["continue-on-error"] || job.uses || job.environment)
      throw Error("workflow_privilege");
    if (!Number.isInteger(job["timeout-minutes"]) || Number(job["timeout-minutes"]) > 20)
      throw Error("workflow_timeout");
    same(job["runs-on"], name === "checks-macos" ? "macos-15" : "ubuntu-24.04");
    if (name === "pr-gate") {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: This is literal GitHub Actions syntax.
      same(job.if, "${{ always() }}");
      same(job.needs, [...requiredJobs]);
    } else if ("if" in job || "needs" in job) throw Error("workflow_skip");
    if (!Array.isArray(job.steps)) throw Error("workflow_steps");
    for (const value of job.steps) {
      const step = object(value);
      if (step["continue-on-error"]) throw Error("workflow_ignore_failure");
      if (step.uses && !pins.has(String(step.uses))) throw Error("workflow_action_pin");
      if (String(step.uses).startsWith("actions/checkout@"))
        same(step.with, { "persist-credentials": false });
      if (String(step.uses).startsWith("actions/upload-artifact@")) {
        const settings = object(step.with);
        same(settings["retention-days"], 7);
        same(settings["include-hidden-files"], false);
      } else if ("if" in step) throw Error("workflow_skip");
    }
    const commands = job.steps.map((value) => String(object(value).run ?? "")).join("\n");
    const expected: Record<string, string> = {
      "checks-linux": "bun run check",
      "checks-macos": "bun run check",
      "web-build": "bun run build:web",
      "fixture-smoke": "bun run test:browser",
      "workflow-check": "bun run check:workflow",
      "pr-gate": "node scripts/ci/gate.ts",
    };
    if (!commands.split("\n").includes(expected[name] ?? "missing"))
      throw Error("workflow_missing_check");
    if (name !== "pr-gate" && !commands.split("\n").includes("bun install --frozen-lockfile"))
      throw Error("workflow_install");
    if (name === "pr-gate") {
      const gate = object(job.steps.find((value) => object(value).run === expected[name]));
      // biome-ignore lint/suspicious/noTemplateCurlyInString: This is literal GitHub Actions syntax.
      same(gate.env, { GATE_NEEDS: "${{ toJSON(needs) }}" });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    checkWorkflow(readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8"));
    console.log("Workflow syntax and required-check contract verified.");
  } catch {
    console.error("Workflow does not satisfy the required-check/security contract.");
    process.exitCode = 1;
  }
}
