import { beforeEach, describe, expect, it } from "vitest";
import { MovementDirection, Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestUser } from "@/test/fixtures";
import { recordStockMovement } from "@/application/stock/recordStockMovement";
import { listRecentMovements } from "./listRecentMovements";

beforeEach(async () => {
  await resetDatabase();
});

describe("listRecentMovements", () => {
  it("returns movements newest first, with item and actor context", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 10 });
    const performer = await createTestUser({ role: Role.STORE_MANAGER, displayName: "Priya Manager" });

    await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.ADD,
      quantity: 5,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });
    await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.ADJUSTMENT,
      quantity: -1,
      reason: "damaged unit",
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });

    const movements = await listRecentMovements(Role.STORE_OPERATOR);

    expect(movements).toHaveLength(2);
    expect(movements[0].direction).toBe(MovementDirection.ADJUSTMENT);
    expect(movements[0].reason).toBe("damaged unit");
    expect(movements[0].performedByName).toBe("Priya Manager");
    expect(movements[1].direction).toBe(MovementDirection.ADD);
    expect(movements[0].itemName).toBe(item.name);
  });

  it("respects the limit parameter", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 100 });
    const performer = await createTestUser({ role: Role.STORE_MANAGER });

    for (let i = 0; i < 5; i += 1) {
      await recordStockMovement({
        itemId: item.id,
        direction: MovementDirection.ADD,
        quantity: 1,
        performedByUserId: performer.id,
        performedByRole: Role.STORE_MANAGER,
      });
    }

    const movements = await listRecentMovements(Role.STORE_OPERATOR, 3);
    expect(movements).toHaveLength(3);
  });
});
