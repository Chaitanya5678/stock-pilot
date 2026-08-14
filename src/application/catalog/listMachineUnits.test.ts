import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine, createTestMachineUnit } from "@/test/fixtures";
import { listMachineUnits } from "./listMachineUnits";

beforeEach(async () => {
  await resetDatabase();
});

describe("listMachineUnits", () => {
  it("includes the parent machine's name", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id, name: "Boiler" });
    await createTestMachineUnit({ machineId: machine.id, name: "Boiler 01" });

    const units = await listMachineUnits(Role.STORE_OPERATOR);

    expect(units).toEqual([{ id: units[0].id, name: "Boiler 01", machineId: machine.id, machineName: "Boiler" }]);
  });
});
