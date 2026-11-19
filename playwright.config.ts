import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: "test-results",
  reporter: [["list"], ["html", { open: "never" }]],
  use: { browserName: "chromium", trace: "retain-on-failure", screenshot: "only-on-failure" },
});
