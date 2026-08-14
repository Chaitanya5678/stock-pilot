import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine, createTestMachineUnit } from "@/test/fixtures";
import { listMachines } from "./listMachines";

beforeEach(async () => {
  await resetDatabase();
});

describe("listMachines", () => {
  it("includes department name and unit count", async () => {
    const department = await createTestDepartment({ name: "Utilities" });
    const machine = await createTestMachine({ departmentId: department.id, name: "Boiler" });
    await createTestMachineUnit({ machineId: machine.id });

    const machines = await listMachines(Role.STORE_OPERATOR);

    expect(machines).toHaveLength(1);
    expect(machines[0]).toMatchObject({ name: "Boiler", departmentName: "Utilities", unitCount: 1 });
  });
});
