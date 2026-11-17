// Explicit read-only integration harness, not a market-data CLI or collector service.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual, parseEnv } from "node:util";
import {
  collectSnapshot,
  eligibility,
  prepareForUse,
  readConfig,
} from "../apps/backend/src/index.ts";
import { failure, jsonEvidence, POLICY } from "../packages/protocols/src/index.ts";

try {
  let local: Record<string, string | undefined> = {};
  for (const name of [".env", ".env.local"]) {
    if (existsSync(name)) local = { ...local, ...parseEnv(readFileSync(name, "utf8")) };
  }
  const config = readConfig({ ...local, ...process.env });
  const observation = await collectSnapshot(config);
  const state = eligibility(observation);
  const repeated = observation.block
    ? await collectSnapshot(config, { blockNumber: observation.block.number })
    : null;
  const deterministicState =
    repeated !== null &&
    repeated.block?.hash === observation.block?.hash &&
    isDeepStrictEqual(
      { pools: observation.registry?.pools, codeHashes: observation.registry?.codeHashes },
      { pools: repeated.registry?.pools, codeHashes: repeated.registry?.codeHashes },
    );
  await new Promise((resolve) => setTimeout(resolve, POLICY.maxValidationAgeMs + 10));
  const expired = eligibility(observation);
  const refreshed = observation.registry
    ? await prepareForUse(observation, config)
    : { observation, eligibility: eligibility(observation) };
  const expiryCheck = {
    kind: "elapsed-live-validation-expiry",
    priorValidationExpired: expired.validationExpired,
    validationEventsAfterUse: refreshed.observation.validations.length,
    afterUse: refreshed.eligibility,
  };
  mkdirSync("data", { recursive: true });
  const report = `data/m1-03-live-${observation.attemptId}.json`;
  writeFileSync(
    report,
    `${jsonEvidence({ observation, eligibility: state, repeated, deterministicState, revalidated: refreshed.observation, expiryCheck })}\n`,
  );
  console.log(
    jsonEvidence({
      report,
      block: observation.block,
      deterministicState,
      complete: observation.complete,
      eligibility: state,
      capabilityChecks: observation.capabilities,
      failures: observation.failures,
      registryChecks: observation.registry?.checks.filter((c) => c.status !== "passed") ?? [],
      expiryCheck,
    }),
  );
  if (
    !state.eligibleForLiveQualification ||
    !deterministicState ||
    !repeated?.complete ||
    !refreshed.eligibility.eligibleForLiveQualification ||
    refreshed.observation.validations.length < 2
  )
    process.exitCode = 1;
} catch (error) {
  console.error(failure(error).message);
  process.exitCode = 1;
}
