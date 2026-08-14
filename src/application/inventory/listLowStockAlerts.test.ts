import { beforeEach, describe, expect, it } from "vitest";
import { MovementDirection, Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestUser } from "@/test/fixtures";
import { recordStockMovement } from "@/application/stock/recordStockMovement";
import { listLowStockAlerts } from "./listLowStockAlerts";

beforeEach(async () => {
  await resetDatabase();
});

describe("listLowStockAlerts", () => {
  it("returns an empty list when there is no inventory", async () => {
    await expect(listLowStockAlerts(Role.STORE_OPERATOR)).resolves.toEqual([]);
  });

  it("excludes normal (in-stock) items entirely", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Healthy Item", stock: 50, threshold: 10 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts).toEqual([]);
  });

  it("includes a low-stock item (0 < stock <= threshold) with status LOW_STOCK", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Low Item", stock: 5, threshold: 10 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ name: "Low Item", stock: 5, threshold: 10, status: "LOW_STOCK" });
  });

  it("includes an out-of-stock item (stock === 0) with status OUT_OF_STOCK", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Empty Item", stock: 0, threshold: 10 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ name: "Empty Item", stock: 0, status: "OUT_OF_STOCK" });
  });

  it("includes a boundary item where stock exactly equals threshold", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Boundary Item", stock: 10, threshold: 10 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts[0].status).toBe("LOW_STOCK");
  });

  it("excludes an item one unit above its threshold", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Just Above", stock: 11, threshold: 10 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts).toEqual([]);
  });

  it("handles a zero threshold: only stock 0 alerts, any stock > 0 is excluded", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Zero Threshold Empty", stock: 0, threshold: 0 });
    await createTestInventoryItem({ departmentId: department.id, name: "Zero Threshold Stocked", stock: 1, threshold: 0 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts.map((a) => a.name)).toEqual(["Zero Threshold Empty"]);
    expect(alerts[0].status).toBe("OUT_OF_STOCK");
  });

  it("returns a mixture of low-stock and out-of-stock items sorted ascending by stock", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, name: "Mid", stock: 5, threshold: 10 });
    await createTestInventoryItem({ departmentId: department.id, name: "Zero", stock: 0, threshold: 10 });
    await createTestInventoryItem({ departmentId: department.id, name: "High", stock: 8, threshold: 10 });
    await createTestInventoryItem({ departmentId: department.id, name: "Healthy", stock: 100, threshold: 10 });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts.map((a) => a.name)).toEqual(["Zero", "Mid", "High"]);
    expect(alerts.map((a) => a.status)).toEqual(["OUT_OF_STOCK", "LOW_STOCK", "LOW_STOCK"]);
  });

  it("is viewable by every role (broad catalog:view boundary)", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id, stock: 0, threshold: 10 });

    for (const role of [Role.ADMIN, Role.STORE_MANAGER, Role.STORE_OPERATOR, Role.MAINTENANCE_USER]) {
      await expect(listLowStockAlerts(role)).resolves.toHaveLength(1);
    }
  });

  it("integration: reflects the balance after a recorded stock movement", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, name: "Moved Item", stock: 20, threshold: 10 });
    const performer = await createTestUser({ role: Role.STORE_MANAGER });

    expect(await listLowStockAlerts(Role.STORE_OPERATOR)).toEqual([]);

    await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.CONSUME,
      quantity: 15,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });

    const alerts = await listLowStockAlerts(Role.STORE_OPERATOR);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ name: "Moved Item", stock: 5, status: "LOW_STOCK" });
  });

  it("does not mutate stock or create any stock movement as a side effect of loading alerts", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 3, threshold: 10 });

    await listLowStockAlerts(Role.STORE_OPERATOR);
    await listLowStockAlerts(Role.ADMIN);

    const reloaded = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(reloaded.stock.toNumber()).toBe(3);
    expect(await prisma.stockMovement.count()).toBe(0);
  });
});
