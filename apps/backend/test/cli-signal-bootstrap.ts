// Test-only preload for the actual CLI process. No public CLI flag or application dependency.
globalThis.fetch = async () => {
  process.stderr.write("CLI_TEST_FETCH_STARTED\n");
  return new Promise<Response>(() => {});
};
export {};
