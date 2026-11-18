import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "apps/*/test/**/*.test.ts",
      "scripts/local/test/**/*.test.ts",
      "scripts/ci/test/**/*.test.ts",
    ],
    testTimeout: 10_000,
    maxWorkers: 2,
  },
});
