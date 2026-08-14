import { test, expect } from "@playwright/test";

// Runs against the dev database's seed data (docs/DATA_MIGRATION.md) — the
// dev-only "operator@stockpilot.local" account. Uses an ADD ("Stock in")
// movement so the test is safe to re-run repeatedly without depending on a
// specific starting stock value.
const ITEM_NAME = "Bearing, Ball, Sealed, 20mm ID";

test("login -> inventory -> stock-in movement -> balance and history update", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("operator@stockpilot.local");
  await page.getByLabel("Password").fill("DevPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("heading", { name: "Product inventory" })).toBeVisible();

  const row = page.locator("tr", { hasText: ITEM_NAME });
  await expect(row).toBeVisible();
  const stockBefore = Number((await row.locator(".stock-number").innerText()).replace(/,/g, ""));

  await row.getByRole("button", { name: "Use" }).click();

  await expect(page.locator(".product-match")).toContainText(ITEM_NAME);

  await page.locator("#movementQuantity").fill("1");
  await page.locator("#movementType").selectOption("ADD");
  await page.getByRole("button", { name: "Record movement" }).click();

  await expect(page.locator(".form-success")).toContainText("recorded");

  // The table reflects the new balance once router.refresh() re-fetches the
  // server component's data — an auto-retrying assertion absorbs that delay.
  await expect(row.locator(".stock-number")).toHaveText(String(stockBefore + 1), { timeout: 5000 });

  const historyTop = page.locator(".movement-row").first();
  await expect(historyTop).toContainText(ITEM_NAME);
  await expect(historyTop).toContainText("Stock in");

  // Regression: the lookup field must clear after a successful submission
  // (docs/BUSINESS_RULES.md §2 — reference behaviour), so a scanner-driven
  // workflow can move straight to the next product without a stale match.
  await expect(page.locator("#productLookup")).toHaveValue("");
  await expect(page.locator(".product-match")).toHaveText("Ready to scan or enter a product code.");
});

test("STORE_OPERATOR movement form does not offer Adjustment", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("operator@stockpilot.local");
  await page.getByLabel("Password").fill("DevPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inventory$/);

  const options = await page.locator("#movementType option").allTextContents();
  expect(options).toEqual(["Stock in", "Consumption"]);
});
