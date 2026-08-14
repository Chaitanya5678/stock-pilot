import { test, expect } from "@playwright/test";

// Runs against the dev database's seed data (docs/DATA_MIGRATION.md). Names
// are timestamped so repeat runs never collide.
const stamp = Date.now();
const DEPT_NAME = `E2E Dept ${stamp}`;
const MACHINE_NAME = `E2E Machine ${stamp}`;
const UNIT_NAME = `E2E Unit ${stamp}`;

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("DevPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
}

test("ADMIN creates a Department -> Machine -> Machine Unit, then sees them in the Product form", async ({ page }) => {
  await login(page, "admin@stockpilot.local");
  await page.getByRole("link", { name: "Machines" }).click();
  await expect(page).toHaveURL(/\/machines$/);

  // Department
  await page.getByRole("button", { name: "Add department" }).click();
  await page.locator("#deptName").fill(DEPT_NAME);
  await page.getByRole("button", { name: "Add department" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Add department" })).not.toBeVisible();
  await expect(page.locator(".master-row", { hasText: DEPT_NAME })).toBeVisible();

  // Machine, under the new department
  await page.getByRole("button", { name: "Add machine model" }).click();
  await page.locator("#machineName").fill(MACHINE_NAME);
  await page.locator("#machineDepartment").selectOption({ label: DEPT_NAME });
  await page.locator("#machineCost").fill("0");
  await page.getByRole("button", { name: "Add model" }).click();
  await expect(page.getByRole("heading", { name: "Add machine model" })).not.toBeVisible();
  const machineRow = page.locator(".master-row", { hasText: MACHINE_NAME });
  await expect(machineRow).toBeVisible();
  await expect(machineRow).toContainText(DEPT_NAME);

  // Machine unit, under the new machine
  await page.getByRole("button", { name: "Add machine unit" }).click();
  const machineOptionValue = await page
    .locator("#unitMachine option", { hasText: MACHINE_NAME })
    .getAttribute("value");
  await page.locator("#unitMachine").selectOption(machineOptionValue!);
  await page.locator("#unitName").fill(UNIT_NAME);
  await page.getByRole("button", { name: "Add unit" }).click();
  await expect(page.getByRole("heading", { name: "Add machine unit" })).not.toBeVisible();
  const unitRow = page.locator(".master-row", { hasText: UNIT_NAME });
  await expect(unitRow).toBeVisible();
  await expect(unitRow).toContainText(MACHINE_NAME);

  // The new department and machine must be selectable from the Product Catalog form.
  await page.getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.locator("#itemDepartment option", { hasText: DEPT_NAME })).toHaveCount(1);
  await expect(page.locator("#itemMachine option", { hasText: MACHINE_NAME })).toHaveCount(1);
});

test("STORE_OPERATOR cannot manage master data", async ({ page }) => {
  await login(page, "operator@stockpilot.local");
  await page.getByRole("link", { name: "Machines" }).click();
  await expect(page).toHaveURL(/\/machines$/);

  await expect(page.getByRole("button", { name: "Add department" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add machine model" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add machine unit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
});
