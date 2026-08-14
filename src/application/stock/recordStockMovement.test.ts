import { beforeEach, describe, expect, it } from "vitest";
import { MovementDirection, Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import {
  createTestDepartment,
  createTestInventoryItem,
  createTestMachine,
  createTestMachineUnit,
  createTestUser,
} from "@/test/fixtures";
import { InsufficientStockError, ForbiddenError, ValidationError } from "@/domain/errors";
import { recordStockMovement } from "./recordStockMovement";

beforeEach(async () => {
  await resetDatabase();
});

async function setupStoreItem(stock = 10) {
  const department = await createTestDepartment();
  const item = await createTestInventoryItem({ departmentId: department.id, stock });
  const performer = await createTestUser({ role: Role.STORE_MANAGER });
  return { department, item, performer };
}

describe("recordStockMovement", () => {
  it("adds stock and records a movement with the correct balance snapshot", async () => {
    const { item, performer } = await setupStoreItem(10);

    const result = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.ADD,
      quantity: 5,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });

    expect(result.balanceAfter.toNumber()).toBe(15);

    const updated = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.stock.toNumber()).toBe(15);

    const movement = await prisma.stockMovement.findUniqueOrThrow({ where: { id: result.movementId } });
    expect(movement.direction).toBe(MovementDirection.ADD);
    expect(movement.quantity.toNumber()).toBe(5);
    expect(movement.balanceAfter.toNumber()).toBe(15);
    expect(movement.performedByUserId).toBe(performer.id);
  });

  it("consumes stock down to (but not below) zero", async () => {
    const { item, performer } = await setupStoreItem(10);

    const result = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.CONSUME,
      quantity: 10,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_OPERATOR,
    });

    expect(result.balanceAfter.toNumber()).toBe(0);
  });

  it("rejects a consume that would take stock negative, and writes no movement row", async () => {
    const { item, performer } = await setupStoreItem(3);

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.CONSUME,
        quantity: 4,
        performedByUserId: performer.id,
        performedByRole: Role.STORE_OPERATOR,
      }),
    ).rejects.toThrow(InsufficientStockError);

    const updated = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.stock.toNumber()).toBe(3);
    const movements = await prisma.stockMovement.findMany({ where: { itemId: item.id } });
    expect(movements).toHaveLength(0);
  });

  it("records a negative-delta adjustment with a reason, and rejects one without a reason", async () => {
    const { item, performer } = await setupStoreItem(10);

    const result = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.ADJUSTMENT,
      quantity: -3,
      reason: "cycle count correction",
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });
    expect(result.balanceAfter.toNumber()).toBe(7);

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.ADJUSTMENT,
        quantity: 2,
        performedByUserId: performer.id,
        performedByRole: Role.STORE_MANAGER,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an adjustment that would take stock negative", async () => {
    const { item, performer } = await setupStoreItem(2);

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.ADJUSTMENT,
        quantity: -5,
        reason: "damaged write-off",
        performedByUserId: performer.id,
        performedByRole: Role.STORE_MANAGER,
      }),
    ).rejects.toThrow(InsufficientStockError);
  });

  it("enforces role permissions per movement direction", async () => {
    const { item, performer } = await setupStoreItem(10);

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.ADD,
        quantity: 1,
        performedByUserId: performer.id,
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).rejects.toThrow(ForbiddenError);

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.ADJUSTMENT,
        quantity: 1,
        reason: "test",
        performedByUserId: performer.id,
        performedByRole: Role.STORE_OPERATOR,
      }),
    ).rejects.toThrow(ForbiddenError);

    // MAINTENANCE_USER + CONSUME is only permitted against a machine-linked
    // item (docs/DECISIONS.md "RBAC permission model") — the store-only
    // item above would correctly reject it, see the dedicated test below.
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id });
    const machineLinkedItem = await createTestInventoryItem({
      departmentId: department.id,
      machineId: machine.id,
      stock: 10,
    });

    await expect(
      recordStockMovement({
        itemId: machineLinkedItem.id,
        direction: MovementDirection.CONSUME,
        quantity: 1,
        machineUnitId: unit.id,
        performedByUserId: performer.id,
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).resolves.toBeTruthy();
  });

  it("requires a machine unit of the correct model to consume a machine-linked item", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const otherMachine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id });
    const wrongUnit = await createTestMachineUnit({ machineId: otherMachine.id });
    const item = await createTestInventoryItem({ departmentId: department.id, machineId: machine.id, stock: 10 });
    const performer = await createTestUser({ role: Role.MAINTENANCE_USER });

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.CONSUME,
        quantity: 1,
        performedByUserId: performer.id,
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).rejects.toThrow(ValidationError);

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.CONSUME,
        quantity: 1,
        machineUnitId: wrongUnit.id,
        performedByUserId: performer.id,
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).rejects.toThrow(ValidationError);

    const result = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.CONSUME,
      quantity: 1,
      machineUnitId: unit.id,
      performedByUserId: performer.id,
      performedByRole: Role.MAINTENANCE_USER,
    });
    expect(result.balanceAfter.toNumber()).toBe(9);
  });

  it("blocks MAINTENANCE_USER from consuming a store-only (non-machine-linked) item", async () => {
    const { item } = await setupStoreItem(10);
    const performer = await createTestUser({ role: Role.MAINTENANCE_USER });

    await expect(
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.CONSUME,
        quantity: 1,
        performedByUserId: performer.id,
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("only one of two concurrent consumes past available stock succeeds, and the final balance is correct", async () => {
    const { item } = await setupStoreItem(5);
    const performerA = await createTestUser({ role: Role.STORE_OPERATOR });
    const performerB = await createTestUser({ role: Role.STORE_OPERATOR });

    const outcomes = await Promise.allSettled([
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.CONSUME,
        quantity: 5,
        performedByUserId: performerA.id,
        performedByRole: Role.STORE_OPERATOR,
      }),
      recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.CONSUME,
        quantity: 5,
        performedByUserId: performerB.id,
        performedByRole: Role.STORE_OPERATOR,
      }),
    ]);

    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const updated = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.stock.toNumber()).toBe(0);

    const movements = await prisma.stockMovement.findMany({ where: { itemId: item.id } });
    expect(movements).toHaveLength(1);
  });
});
