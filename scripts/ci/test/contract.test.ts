import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkWorkflow } from "../check-workflow.ts";
import { assertGate, requiredJobs } from "../contract.ts";

const workflow = readFileSync(
  new URL("../../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);
const success = () => Object.fromEntries(requiredJobs.map((name) => [name, { result: "success" }]));
describe("required CI gate", () => {
  it("accepts only the complete successful set", () =>
    expect(() => assertGate(success())).not.toThrow());
  it.each(["failure", "cancelled", "skipped", "timed_out", "neutral", "pending", ""])(
    "blocks %s for every required dependency",
    (result) => {
      for (const name of requiredJobs) {
        expect(() => assertGate({ ...success(), [name]: { result } })).toThrow();
      }
    },
  );
  it("blocks absent, malformed and unexpected dependencies", () => {
    for (const value of [null, [], {}, { ...success(), extra: { result: "success" } }])
      expect(() => assertGate(value)).toThrow();
    for (const name of requiredJobs) {
      const missing = success();
      delete missing[name];
      expect(() => assertGate(missing)).toThrow();
      expect(() => assertGate({ ...success(), [name]: {} })).toThrow();
    }
  });
});
describe("actual workflow policy", () => {
  it("validates the delivery workflow", () => expect(() => checkWorkflow(workflow)).not.toThrow());
  it.each([
    [
      "conditional build",
      "    runs-on: ubuntu-24.04\n",
      "    if: false\n    runs-on: ubuntu-24.04\n",
    ],
    [
      "ignored failure",
      "    timeout-minutes: 20",
      "    continue-on-error: true\n    timeout-minutes: 20",
    ],
    ["write token", "contents: read", "contents: write"],
    ["path filter", "  pull_request:\n", "  pull_request:\n    paths: [apps/web/**]\n"],
    ["retained credential", "persist-credentials: false", "persist-credentials: true"],
    ["mutable action", "checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", "checkout@main"],
    ["missing smoke", "bun run test:browser", "echo skipped"],
    ["missing dependency", "      - fixture-smoke\n", ""],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: This is literal GitHub Actions syntax.
    ["conditional gate", "if: ${{ always() }}", "if: ${{ success() }}"],
  ])("rejects %s", (_name, from, to) => {
    expect(workflow).toContain(from);
    expect(() => checkWorkflow(workflow.replace(from, to))).toThrow();
  });
});
