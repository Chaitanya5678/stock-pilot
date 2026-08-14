import { beforeEach, describe, expect, it } from "vitest";
import { Role, ItemCategory, Criticality, UnitOfMeasure, MovementDirection } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestMachine, createTestUser } from "@/test/fixtures";
import { recordStockMovement } from "@/application/stock/recordStockMovement";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { updateInventoryItem } from "./updateInventoryItem";

beforeEach(async () => {
  await resetDatabase();
});

function baseInput(id: string, departmentId: string, machineId: string | null, role: Role = Role.STORE_MANAGER) {
  return {
    id,
    name: "Updated Name",
    departmentId,
    machineId,
    category: ItemCategory.DURABLE_TOOLS,
    criticality: Criticality.ESSENTIAL,
    rack: "B-02-01",
    unitOfMeasure: UnitOfMeasure.SET,
    threshold: 3,
    price: 15.5,
    performedByRole: role,
  };
}

describe("updateInventoryItem", () => {
  it("updates master-data fields and leaves stock, sku, and barcode untouched", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 42, threshold: 10 });

    const updated = await updateInventoryItem(baseInput(item.id, department.id, null));

    expect(updated.name).toBe("Updated Name");
    expect(updated.category).toBe(ItemCategory.DURABLE_TOOLS);
    expect(updated.threshold.toNumber()).toBe(3);
    expect(updated.stock.toNumber()).toBe(42); // unchanged
    expect(updated.sku).toBe(item.sku); // unchanged
    expect(updated.barcode).toBe(item.barcode); // unchanged
  });

  it("does not change stock even across a stock movement recorded before the edit", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 10 });
    const performer = await createTestUser({ role: Role.STORE_MANAGER });

    await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.ADD,
      quantity: 5,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });

    const stockBefore = (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).stock.toNumber();
    expect(stockBefore).toBe(15);

    await updateInventoryItem(baseInput(item.id, department.id, null));

    const stockAfter = (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).stock.toNumber();
    expect(stockAfter).toBe(stockBefore);
  });

  it("existing stock movements remain intact and recordable after an edit", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 10 });
    const performer = await createTestUser({ role: Role.STORE_MANAGER });

    await updateInventoryItem(baseInput(item.id, department.id, null));

    const result = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.CONSUME,
      quantity: 4,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });
    expect(result.balanceAfter.toNumber()).toBe(6);

    const movements = await prisma.stockMovement.findMany({ where: { itemId: item.id } });
    expect(movements).toHaveLength(1);
  });

  it("can re-link an item to a different machine model", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const item = await createTestInventoryItem({ departmentId: department.id, machineId: null, stock: 5 });

    const updated = await updateInventoryItem(baseInput(item.id, department.id, machine.id));

    expect(updated.machineId).toBe(machine.id);
  });

  it("rejects update from a role without catalog:manage", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id });

    await expect(updateInventoryItem(baseInput(item.id, department.id, null, Role.STORE_OPERATOR))).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("rejects an unknown item id", async () => {
    const department = await createTestDepartment();
    await expect(
      updateInventoryItem(baseInput("00000000-0000-0000-0000-000000000000", department.id, null)),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unknown department id", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id });

    await expect(
      updateInventoryItem(baseInput(item.id, "00000000-0000-0000-0000-000000000000", null)),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unknown machine id", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id });

    await expect(
      updateInventoryItem(baseInput(item.id, department.id, "00000000-0000-0000-0000-000000000000")),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects invalid field values", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id });

    await expect(
      updateInventoryItem({ ...baseInput(item.id, department.id, null), name: "" }),
    ).rejects.toThrow(ValidationError);
  });
});
