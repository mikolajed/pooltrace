export const requiredJobs = [
  "checks-linux",
  "checks-macos",
  "web-build",
  "fixture-smoke",
  "workflow-check",
] as const;

export function assertGate(value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("gate_failed");
  const needs = value as Record<string, unknown>;
  if (
    Object.keys(needs).length !== requiredJobs.length ||
    requiredJobs.some((name) => {
      const job = needs[name];
      return !job || typeof job !== "object" || !("result" in job) || job.result !== "success";
    })
  )
    throw Error("gate_failed");
}
