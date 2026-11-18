import { assertGate } from "./contract.ts";

try {
  assertGate(JSON.parse(process.env.GATE_NEEDS ?? "null"));
  console.log("All required checks passed for this candidate.");
} catch {
  console.error("Required checks failed, were skipped/cancelled, or are missing.");
  process.exitCode = 1;
}
