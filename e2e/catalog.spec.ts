import { test, expect } from "@playwright/test";

// Runs against the dev database's seed data (docs/DATA_MIGRATION.md), using
// the dev-only manager/operator accounts. Product names are timestamped so
// repeat runs never collide.
const PRODUCT_NAME = `E2E Catalog Widget ${Date.now()}`;

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("DevPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
}

test("STORE_MANAGER creates and edits a product without changing its stock", async ({ page }) => {
  await login(page, "manager@stockpilot.local");

  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("heading", { name: "Add inventory item" })).toBeVisible();

  await page.locator("#itemName").fill(PRODUCT_NAME);
  await page.locator("#itemDepartment").selectOption({ label: "Maintenance" });
  await page.locator("#itemCategory").selectOption("CONSUMABLES");
  await page.locator("#itemRack").fill("Z-99-01");
  await page.locator("#itemStock").fill("7");
  await page.locator("#itemThreshold").fill("3");
  await page.locator("#itemPrice").fill("12.5");
  await page.getByRole("button", { name: "Add item" }).click();

  await expect(page.getByRole("heading", { name: "Add inventory item" })).not.toBeVisible();

  const search = page.getByLabel("Search inventory");
  await search.fill(PRODUCT_NAME);
  const row = page.locator("tr", { hasText: PRODUCT_NAME });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Consumables");
  const stockBefore = await row.locator(".stock-number").innerText();
  expect(stockBefore.replace(/,/g, "")).toBe("7");

  // Edit: change name and category, verify the update lands and stock is untouched.
  await row.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit inventory item" })).toBeVisible();

  const editedName = `${PRODUCT_NAME} (edited)`;
  await page.locator("#itemName").fill(editedName);
  await page.locator("#itemCategory").selectOption("DURABLE_TOOLS");
  // The edit form must never offer a stock field at all.
  await expect(page.locator("#itemStock")).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { name: "Edit inventory item" })).not.toBeVisible();

  await search.fill(editedName);
  const editedRow = page.locator("tr", { hasText: editedName });
  await expect(editedRow).toBeVisible();
  await expect(editedRow).toContainText("Durable Tools");
  await expect(editedRow.locator(".stock-number")).toHaveText("7");
});

test("STORE_OPERATOR cannot see catalog management controls", async ({ page }) => {
  await login(page, "operator@stockpilot.local");

  await expect(page.getByRole("button", { name: "Add product" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
});
