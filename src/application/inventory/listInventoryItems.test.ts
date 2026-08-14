import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestMachine, createTestMachineUnit } from "@/test/fixtures";
import { listInventoryItems } from "./listInventoryItems";

beforeEach(async () => {
  await resetDatabase();
});

describe("listInventoryItems", () => {
  it("includes department, machine, and machine-unit context, sorted by name", async () => {
    const department = await createTestDepartment({ name: "Utilities" });
    const machine = await createTestMachine({ departmentId: department.id, name: "Boiler" });
    const unit = await createTestMachineUnit({ machineId: machine.id, name: "Boiler 01" });
    await createTestInventoryItem({ departmentId: department.id, machineId: machine.id, name: "B Item", stock: 5, threshold: 10 });
    await createTestInventoryItem({ departmentId: department.id, machineId: null, name: "A Item", stock: 0, threshold: 5 });

    const items = await listInventoryItems(Role.STORE_OPERATOR);

    expect(items.map((item) => item.name)).toEqual(["A Item", "B Item"]);

    const storeOnly = items.find((item) => item.name === "A Item")!;
    expect(storeOnly.machine).toBeNull();
    expect(storeOnly.machineUnits).toEqual([]);
    expect(storeOnly.status).toBe("OUT_OF_STOCK");

    const machineLinked = items.find((item) => item.name === "B Item")!;
    expect(machineLinked.machine).toEqual({ id: machine.id, name: "Boiler" });
    expect(machineLinked.machineUnits).toEqual([{ id: unit.id, name: "Boiler 01" }]);
    expect(machineLinked.status).toBe("LOW_STOCK");
  });

  it("returns an empty list rather than erroring when there is no inventory", async () => {
    await expect(listInventoryItems(Role.ADMIN)).resolves.toEqual([]);
  });
});
