import { test, expect } from "@playwright/test";

// Runs against the dev database's seed data (docs/DATA_MIGRATION.md), which
// already spans out-of-stock, low-stock, and well-stocked items — this test
// is read-only, so it never needs to create data or worry about re-run
// collisions.

test("STORE_OPERATOR sees the low-stock alert card with correct out-of-stock/low-stock/normal classification", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("operator@stockpilot.local");
  await page.getByLabel("Password").fill("DevPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inventory$/);

  await expect(page.getByRole("heading", { name: "Low stock alerts" })).toBeVisible();

  const alertList = page.locator(".alert-list");

  // Out-of-stock seed item.
  const outOfStockRow = alertList.locator(".alert-row", { hasText: "Filter, Air, Compressor Unit 2" });
  await expect(outOfStockRow).toBeVisible();
  await expect(outOfStockRow.locator(".alert-danger")).toHaveText("Out of stock");

  // Low-stock seed items (stock > 0 but <= threshold).
  await expect(alertList.locator(".alert-row", { hasText: "Oil, Hydraulic, ISO 46, 20L" })).toBeVisible();
  await expect(
    alertList.locator(".alert-row", { hasText: "Oil, Hydraulic, ISO 46, 20L" }).locator(".alert-warning"),
  ).toContainText("left");

  // Normal-stock seed item must not appear in the alert card at all, even
  // though it's visible in the main inventory table elsewhere on the page.
  await expect(alertList.locator(".alert-row", { hasText: "Bearing, Ball, Sealed, 20mm ID" })).toHaveCount(0);

  // Count badge matches the number of alert rows actually rendered.
  const rowCount = await alertList.locator(".alert-row").count();
  await expect(page.locator(".count-badge")).toHaveText(`${rowCount} ${rowCount === 1 ? "item" : "items"}`);

  // Clicking "Use" on an alert row feeds the existing product-selection
  // mechanism (same one InventoryTable's "Use" button uses).
  await outOfStockRow.getByRole("button", { name: "Use" }).click();
  await expect(page.locator(".product-match")).toContainText("Filter, Air, Compressor Unit 2");
});
