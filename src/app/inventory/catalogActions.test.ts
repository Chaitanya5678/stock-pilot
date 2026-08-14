import { beforeEach, describe, expect, it } from "vitest";
import { ItemCategory, Criticality, UnitOfMeasure, Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestUser } from "@/test/fixtures";
import { performCreateProduct, performUpdateProduct } from "./catalogActions";

beforeEach(async () => {
  await resetDatabase();
});

async function sessionFor(role: Role) {
  const user = await createTestUser({ role });
  return { userId: user.id, role, email: user.email, displayName: user.displayName };
}

function createInput(departmentId: string) {
  return {
    name: "Bearing, Ball, Sealed",
    departmentId,
    machineId: null,
    category: ItemCategory.OPERATING_SPARES,
    criticality: Criticality.VITAL,
    rack: "A-03-12",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 10,
    threshold: 5,
    price: 9.99,
  };
}

describe("performCreateProduct", () => {
  it("creates a product for an authorized role", async () => {
    const department = await createTestDepartment();
    const session = await sessionFor(Role.STORE_MANAGER);

    const result = await performCreateProduct(session, createInput(department.id));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: result.itemId } });
      expect(item.name).toBe("Bearing, Ball, Sealed");
    }
  });

  it("rejects an unauthorized role with a permission message, not a stack trace", async () => {
    const department = await createTestDepartment();
    const session = await sessionFor(Role.STORE_OPERATOR);

    const result = await performCreateProduct(session, createInput(department.id));

    expect(result).toEqual({ ok: false, error: "You do not have permission to perform this action." });
  });

  it("rejects invalid input with a friendly message", async () => {
    const department = await createTestDepartment();
    const session = await sessionFor(Role.STORE_MANAGER);

    const result = await performCreateProduct(session, { ...createInput(department.id), name: "" });

    expect(result.ok).toBe(false);
  });

  it("rejects malformed input before it reaches the domain layer", async () => {
    const session = await sessionFor(Role.STORE_MANAGER);
    const result = await performCreateProduct(session, { name: "X" });
    expect(result).toEqual({ ok: false, error: "Please check the product details and try again." });
  });
});

describe("performUpdateProduct", () => {
  it("updates a product for an authorized role", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 20 });
    const session = await sessionFor(Role.ADMIN);

    const result = await performUpdateProduct(session, {
      id: item.id,
      name: "Renamed Item",
      departmentId: department.id,
      machineId: null,
      category: ItemCategory.DURABLE_TOOLS,
      criticality: Criticality.ESSENTIAL,
      rack: "B-01-01",
      unitOfMeasure: UnitOfMeasure.SET,
      threshold: 2,
      price: 5,
    });

    expect(result.ok).toBe(true);
    const updated = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.name).toBe("Renamed Item");
  });

  it("does not change stock: stock before === stock after an edit", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 33 });
    const session = await sessionFor(Role.STORE_MANAGER);

    const stockBefore = (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).stock.toNumber();

    await performUpdateProduct(session, {
      id: item.id,
      name: "Renamed Again",
      departmentId: department.id,
      machineId: null,
      category: item.category,
      criticality: item.criticality,
      rack: "C-01-01",
      unitOfMeasure: item.unitOfMeasure,
      threshold: 9,
      price: 9,
    });

    const stockAfter = (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).stock.toNumber();
    expect(stockAfter).toBe(stockBefore);
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id });
    const session = await sessionFor(Role.MAINTENANCE_USER);

    const result = await performUpdateProduct(session, {
      id: item.id,
      name: "Should Not Apply",
      departmentId: department.id,
      machineId: null,
      category: item.category,
      criticality: item.criticality,
      rack: "C-01-01",
      unitOfMeasure: item.unitOfMeasure,
      threshold: 9,
      price: 9,
    });

    expect(result).toEqual({ ok: false, error: "You do not have permission to perform this action." });
    const unchanged = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(unchanged.name).not.toBe("Should Not Apply");
  });
});
