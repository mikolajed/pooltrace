export function publicConfig() {
  const apiOrigin = process.env.POOLTRACE_API_ORIGIN;
  const expectedMode = process.env.POOLTRACE_MODE;
  const runId = process.env.POOLTRACE_RUN_ID;
  if (
    !apiOrigin ||
    !/^http:\/\/127\.0\.0\.1:[0-9]{4,5}$/.test(apiOrigin) ||
    (expectedMode !== "live" && expectedMode !== "fixture") ||
    !runId
  )
    throw new Error("configuration");
  return { contractVersion: "local-process-v1", apiOrigin, expectedMode, runId };
}
