import { beforeEach, describe, expect, it } from "vitest";
import { MovementDirection, Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestUser } from "@/test/fixtures";
import { performRecordMovement } from "./actions";

beforeEach(async () => {
  await resetDatabase();
});

async function setup(role: Role = Role.STORE_MANAGER, stock = 10) {
  const department = await createTestDepartment();
  const item = await createTestInventoryItem({ departmentId: department.id, stock });
  const user = await createTestUser({ role });
  return { item, session: { userId: user.id, role, email: user.email, displayName: user.displayName } };
}

describe("performRecordMovement", () => {
  it("records a valid movement and returns the new balance", async () => {
    const { item, session } = await setup(Role.STORE_MANAGER, 10);

    const result = await performRecordMovement(session, {
      itemId: item.id,
      direction: MovementDirection.ADD,
      quantity: "5",
    });

    expect(result).toEqual({ ok: true, balanceAfter: 15 });
  });

  it("returns a user-facing message for insufficient stock, not an internal error", async () => {
    const { item, session } = await setup(Role.STORE_MANAGER, 2);

    const result = await performRecordMovement(session, {
      itemId: item.id,
      direction: MovementDirection.CONSUME,
      quantity: "5",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/negative stock/i);
  });

  it("returns a permission message rather than throwing for a forbidden role", async () => {
    const { item, session } = await setup(Role.STORE_OPERATOR, 10);

    const result = await performRecordMovement(session, {
      itemId: item.id,
      direction: MovementDirection.ADJUSTMENT,
      quantity: "1",
      reason: "test",
    });

    expect(result).toEqual({ ok: false, error: "You do not have permission to perform this action." });
  });

  it("returns a validation message when an adjustment has no reason", async () => {
    const { item, session } = await setup(Role.STORE_MANAGER, 10);

    const result = await performRecordMovement(session, {
      itemId: item.id,
      direction: MovementDirection.ADJUSTMENT,
      quantity: "-1",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/reason/i);
  });

  it("rejects malformed input before it reaches the domain layer", async () => {
    const { session } = await setup();

    const result = await performRecordMovement(session, { itemId: "", direction: "NOT_REAL" });

    expect(result).toEqual({ ok: false, error: "Please check the movement details and try again." });
  });
});
