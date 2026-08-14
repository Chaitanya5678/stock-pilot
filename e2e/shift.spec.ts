import { test, expect } from "@playwright/test";

// Runs against the dev database's seed data (docs/DATA_MIGRATION.md), which
// already has shift history — this test only ever adds a new entry (no
// existing rows are modified), so it's safe to re-run.
const INCHARGE_ID = `E2E${Date.now()}`.slice(0, 20);

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("DevPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
}

test("STORE_MANAGER records a shift entry, which appears in history and becomes the current in-charge", async ({
  page,
}) => {
  await login(page, "manager@stockpilot.local");

  await expect(page.getByRole("heading", { name: "Shift in-charge log" })).toBeVisible();

  await page.locator("#shiftIncharge").fill(INCHARGE_ID);
  // #shiftTimestamp already defaults to "now" — leave it as-is so the new
  // entry is guaranteed to be the most recent effective entry.
  await page.getByRole("button", { name: "Record in-charge" }).click();

  await expect(page.locator(".form-success")).toContainText(INCHARGE_ID);

  // History (auto-retrying: the panel updates once router.refresh() lands).
  await expect(page.locator(".shift-row").first()).toContainText(INCHARGE_ID);

  // Current in-charge derivation, server-computed, now reflects the new entry.
  await expect(page.locator(".side-top .subtle", { hasText: "Current:" })).toContainText(INCHARGE_ID);
});

test("STORE_OPERATOR cannot record a shift entry but can see current in-charge and history", async ({ page }) => {
  await login(page, "operator@stockpilot.local");

  await expect(page.getByRole("heading", { name: "Shift in-charge log" })).toBeVisible();
  await expect(page.locator(".side-top .subtle", { hasText: "Current:" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record in-charge" })).toHaveCount(0);
  await expect(page.locator("#shiftIncharge")).toHaveCount(0);
});
