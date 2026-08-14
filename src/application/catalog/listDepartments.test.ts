import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestMachine } from "@/test/fixtures";
import { listDepartments } from "./listDepartments";

beforeEach(async () => {
  await resetDatabase();
});

describe("listDepartments", () => {
  it("reports machine and item counts per department", async () => {
    const department = await createTestDepartment({ name: "Utilities" });
    const machine = await createTestMachine({ departmentId: department.id });
    await createTestInventoryItem({ departmentId: department.id, machineId: machine.id });
    await createTestDepartment({ name: "Empty Department" });

    const departments = await listDepartments(Role.STORE_OPERATOR);

    const utilities = departments.find((d) => d.name === "Utilities")!;
    expect(utilities.machineCount).toBe(1);
    expect(utilities.itemCount).toBe(1);

    const empty = departments.find((d) => d.name === "Empty Department")!;
    expect(empty.machineCount).toBe(0);
    expect(empty.itemCount).toBe(0);
  });
});
