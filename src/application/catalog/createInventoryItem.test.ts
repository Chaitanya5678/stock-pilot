import { beforeEach, describe, expect, it } from "vitest";
import { ItemCategory, Criticality, UnitOfMeasure, Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine } from "@/test/fixtures";
import { ForbiddenError, ValidationError } from "@/domain/errors";
import { createInventoryItem } from "./createInventoryItem";

beforeEach(async () => {
  await resetDatabase();
});

function baseInput(departmentId: string, machineId: string | null, performedByRole: Role = Role.STORE_MANAGER) {
  return {
    name: "Bearing, Ball, Sealed",
    departmentId,
    machineId,
    category: ItemCategory.OPERATING_SPARES,
    criticality: Criticality.VITAL,
    rack: "A-03-12",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 10,
    threshold: 5,
    price: 9.99,
    performedByRole,
  };
}

describe("createInventoryItem", () => {
  it("generates a unique SKU and barcode built from department/machine/category/criticality", async () => {
    const department = await createTestDepartment({ name: "Maintenance", code: "MNT" });
    const machine = await createTestMachine({ departmentId: department.id, name: "Compressor", code: "CMP" });

    const item = await createInventoryItem(baseInput(department.id, machine.id));

    expect(item.sku).toMatch(/^MNT-CMP-OSP-V-\d+$/);
    expect(item.barcode).toMatch(/^8901001\d{6}$/);
  });

  it("never generates the same SKU or barcode twice, even for identical inputs", async () => {
    const department = await createTestDepartment({ name: "Maintenance", code: "MNT" });
    const machine = await createTestMachine({ departmentId: department.id, name: "Compressor", code: "CMP" });

    const first = await createInventoryItem(baseInput(department.id, machine.id));
    const second = await createInventoryItem(baseInput(department.id, machine.id));

    expect(first.sku).not.toBe(second.sku);
    expect(first.barcode).not.toBe(second.barcode);
  });

  it("falls back to the GEN machine code for store-only items", async () => {
    const department = await createTestDepartment({ name: "Safety", code: "SAF" });

    const item = await createInventoryItem(baseInput(department.id, null));

    expect(item.sku).toMatch(/^SAF-GEN-OSP-V-\d+$/);
    expect(item.machineId).toBeNull();
  });

  it("rejects invalid product fields before touching the database", async () => {
    const department = await createTestDepartment();

    await expect(createInventoryItem(baseInput(department.id, null, Role.STORE_MANAGER))).resolves.toBeTruthy();
    await expect(
      createInventoryItem({ ...baseInput(department.id, null), name: "" }),
    ).rejects.toThrow(ValidationError);
  });

  it("requires catalog:manage permission", async () => {
    const department = await createTestDepartment();

    await expect(
      createInventoryItem(baseInput(department.id, null, Role.MAINTENANCE_USER)),
    ).rejects.toThrow(ForbiddenError);
  });
});
