import { expect, test } from "@playwright/test";
import { EvidenceStore } from "../../apps/backend/src/storage/store.ts";
import { fixtureApp } from "./fixture-app.ts";

// Independent string-based oracle; do not share the UI's bigint formatter under test.
function decimal(value: string | null, places = 6) {
  if (value === null) return "Unavailable";
  const negative = value.startsWith("-");
  const digits = (negative ? value.slice(1) : value).padStart(places + 1, "0");
  const fraction = digits.slice(-places).replace(/0+$/, "");
  return `${negative ? "−" : ""}${digits.slice(0, -places)}${fraction ? `.${fraction}` : ""}`;
}

test("fixture browser preserves exact evidence and withdraws current state through native stop/restart", async ({
  page,
}, info) => {
  const app = await fixtureApp();
  try {
    const firstRun = await app.start();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return [app.web, app.backend].includes(url.origin) ? route.continue() : route.abort();
    });
    await page.goto(app.web);
    await expect(page.getByText("CONSTRUCTED FIXTURE", { exact: false })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(36);
    await expect(page.locator(".connection")).toHaveText("Connected");
    const best = page.locator(".metrics article").first().locator("strong");
    await expect(best).toHaveText("−0.034985 USDC");
    await expect(page.locator(".metrics article").nth(1).locator("strong")).toHaveText(
      "Unavailable",
    );
    await expect(page.locator(".metrics article").nth(2).locator("strong")).toHaveText(
      "Unavailable",
    );
    const current = await app.json("/api/v1/current");
    expect(current.result.persistence.status).toBe("saved");
    expect(current.result.analysis.rows).toHaveLength(36);
    expect(current.result.constructed).toBe(true);
    for (const [index, row] of current.result.analysis.rows.entries()) {
      const cells = page.locator("tbody tr").nth(index).locator("td");
      const quote = current.result.analysis.quotes.find(
        (q: { quoteId: string }) => q.quoteId === row.leg1,
      );
      await expect(cells.nth(1)).toHaveText(decimal(row.input));
      await expect(cells.nth(2)).toHaveText(decimal(quote.output, 18));
      await expect(cells.nth(3)).toHaveText(decimal(row.output));
      await expect(cells.nth(4)).toHaveText(decimal(row.gross));
    }
    await page.getByRole("button", { name: "Refresh history" }).click();
    await page.locator(".history button").first().click();
    await expect(page.getByText("HISTORICAL EVIDENCE", { exact: false })).toBeVisible();
    await expect(best).toHaveText("Unavailable");
    await expect(page.getByRole("heading", { name: "Historical cycle outcomes" })).toBeVisible();
    await page.getByRole("button", { name: "Return to current" }).click();
    await page.getByRole("button", { name: "Observations", exact: true }).click();
    await page.locator(".history button").first().click();
    await expect(page.getByRole("heading", { name: "Historical observation" })).toBeVisible();
    await expect(page.getByText("Saved historical version", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Return to current" }).click();
    await page.reload();
    await expect(page.locator("tbody tr")).toHaveCount(36);
    await expect(best).toHaveText("−0.034985 USDC");
    // Native service suspension stops SSE heartbeats and collection. Browser must withdraw itself.
    app.suspend();
    await expect(best).toHaveText("Unavailable", { timeout: 7000 });
    await expect(page.locator(".connection")).toHaveText("Waiting for updates");
    await expect(page.locator("tbody tr")).toHaveCount(36);
    app.resume();
    await expect(page.locator(".connection")).toHaveText("Connected");
    await expect(best).toHaveText("−0.034985 USDC");
    const saved = await app.json("/api/v1/history/analyses?limit=1");
    const revision = saved.rows[0].revision_id as string;
    expect(await app.stop("SIGINT")).toBe(130);
    await expect(best).toHaveText("Unavailable");
    const store = new EvidenceStore(app.database);
    try {
      const historical = store.getAnalysis(revision);
      expect(historical.context).toBe("historical");
      expect(historical.currentBest).toBeNull();
      expect(historical.eligibleForLiveQualification).toBe(false);
    } finally {
      store.close();
    }
    // Leave the stopped Next dev client's HMR session before explicitly navigating after restart.
    await page.goto("about:blank");
    const secondRun = await app.start();
    expect(secondRun).not.toBe(firstRun);
    const history = await app.json(`/api/v1/history/analyses/${revision}`);
    expect(history.context).toBe("historical");
    expect(history.currentBest).toBeNull();
    expect(history.eligibleForLiveQualification).toBe(false);
    await page.goto(app.web);
    await expect(page.locator("tbody tr")).toHaveCount(36);
    await expect(page.locator(".connection")).toHaveText("Connected");
    expect(await app.stop("SIGTERM")).toBe(143);
    await info.attach("fixture-lifecycle", {
      body: Buffer.from(
        JSON.stringify({ constructed: true, events: app.events, historicalRevision: revision }),
      ),
      contentType: "application/json",
    });
  } finally {
    await app.dispose();
  }
});
