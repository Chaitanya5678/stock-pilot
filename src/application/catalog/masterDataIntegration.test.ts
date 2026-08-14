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
import { recordStockMovement } from "@/application/stock/recordStockMovement";
import { createDepartment } from "./createDepartment";
import { updateDepartment } from "./updateDepartment";
import { createMachine } from "./createMachine";
import { updateMachine } from "./updateMachine";
import { createMachineUnit } from "./createMachineUnit";
import { updateMachineUnit } from "./updateMachineUnit";
import { listCatalogOptions } from "./listCatalogOptions";

beforeEach(async () => {
  await resetDatabase();
});

describe("master data relationship integrity", () => {
  it("editing a department does not corrupt its machines", async () => {
    const department = await createTestDepartment({ name: "Utilities" });
    const machine = await createTestMachine({ departmentId: department.id, name: "Boiler" });

    await updateDepartment({ id: department.id, name: "Utilities & Power", performedByRole: Role.ADMIN });

    const reloadedMachine = await prisma.machine.findUniqueOrThrow({ where: { id: machine.id } });
    expect(reloadedMachine.departmentId).toBe(department.id);
    expect(reloadedMachine.name).toBe("Boiler");
  });

  it("editing a machine does not corrupt its units", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id, name: "Boiler 01" });

    await updateMachine({
      id: machine.id,
      name: "Renamed Machine",
      departmentId: department.id,
      cost: 100,
      performedByRole: Role.ADMIN,
    });

    const reloadedUnit = await prisma.machineUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(reloadedUnit.machineId).toBe(machine.id);
    expect(reloadedUnit.name).toBe("Boiler 01");
  });

  it("existing product references remain valid after editing the department/machine they point to", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const item = await createTestInventoryItem({ departmentId: department.id, machineId: machine.id });

    await updateDepartment({ id: department.id, name: "Renamed Dept", performedByRole: Role.ADMIN });
    await updateMachine({
      id: machine.id,
      name: "Renamed Machine",
      departmentId: department.id,
      cost: 0,
      performedByRole: Role.ADMIN,
    });

    const reloadedItem = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(reloadedItem.departmentId).toBe(department.id);
    expect(reloadedItem.machineId).toBe(machine.id);
  });

  it("existing stock movements remain intact and new ones still work after department/machine edits", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id });
    const item = await createTestInventoryItem({ departmentId: department.id, machineId: machine.id, stock: 10 });
    const performer = await createTestUser({ role: Role.STORE_MANAGER });

    const firstMovement = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.ADD,
      quantity: 5,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });

    await updateDepartment({ id: department.id, name: "Renamed", performedByRole: Role.ADMIN });
    await updateMachine({
      id: machine.id,
      name: "Renamed Machine",
      departmentId: department.id,
      cost: 0,
      performedByRole: Role.ADMIN,
    });
    await updateMachineUnit({ id: unit.id, machineId: machine.id, name: "Renamed Unit", performedByRole: Role.ADMIN });

    const preservedMovement = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: firstMovement.movementId },
    });
    expect(preservedMovement.quantity.toNumber()).toBe(5);

    const secondMovement = await recordStockMovement({
      itemId: item.id,
      direction: MovementDirection.CONSUME,
      quantity: 3,
      machineUnitId: unit.id,
      performedByUserId: performer.id,
      performedByRole: Role.STORE_MANAGER,
    });
    expect(secondMovement.balanceAfter.toNumber()).toBe(12);
  });
});

describe("master data changes never touch stock", () => {
  it("creating/editing departments, machines, and machine units does not alter any item's stock or create any movement", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const item = await createTestInventoryItem({ departmentId: department.id, machineId: machine.id, stock: 25 });

    const newDepartment = await createDepartment({ name: "Production", performedByRole: Role.ADMIN });
    await updateDepartment({ id: department.id, name: "Renamed Dept", performedByRole: Role.ADMIN });
    const newMachine = await createMachine({
      name: "Packaging Line",
      departmentId: newDepartment.id,
      cost: 0,
      performedByRole: Role.ADMIN,
    });
    await updateMachine({
      id: machine.id,
      name: "Renamed Machine",
      departmentId: department.id,
      cost: 999,
      performedByRole: Role.ADMIN,
    });
    const newUnit = await createMachineUnit({
      machineId: newMachine.id,
      name: "Packaging Line A-01",
      performedByRole: Role.ADMIN,
    });
    await updateMachineUnit({ id: newUnit.id, machineId: newMachine.id, name: "Renamed Unit", performedByRole: Role.ADMIN });

    const reloadedItem = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(reloadedItem.stock.toNumber()).toBe(25);

    const movementCount = await prisma.stockMovement.count();
    expect(movementCount).toBe(0);
  });
});

describe("product catalog integration", () => {
  it("newly created departments and machines appear in the product form's options", async () => {
    const before = await listCatalogOptions(Role.STORE_MANAGER);
    const beforeDeptCount = before.departments.length;
    const beforeMachineCount = before.machines.length;

    const department = await createDepartment({ name: "Newly Added Dept", performedByRole: Role.ADMIN });
    await createMachine({ name: "Newly Added Machine", departmentId: department.id, cost: 0, performedByRole: Role.ADMIN });

    const after = await listCatalogOptions(Role.STORE_MANAGER);
    expect(after.departments).toHaveLength(beforeDeptCount + 1);
    expect(after.machines).toHaveLength(beforeMachineCount + 1);
    expect(after.departments.some((d) => d.name === "Newly Added Dept")).toBe(true);
    expect(after.machines.some((m) => m.name === "Newly Added Machine")).toBe(true);
  });
});
