import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine } from "@/test/fixtures";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { createMachineUnit } from "./createMachineUnit";

beforeEach(async () => {
  await resetDatabase();
});

describe("createMachineUnit", () => {
  it("creates a unit linked to an existing machine", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });

    const unit = await createMachineUnit({ machineId: machine.id, name: "Boiler 01", performedByRole: Role.ADMIN });

    expect(unit.machineId).toBe(machine.id);
    expect(unit.name).toBe("Boiler 01");
  });

  it("rejects a unit that references a nonexistent machine", async () => {
    await expect(
      createMachineUnit({
        machineId: "00000000-0000-0000-0000-000000000000",
        name: "Boiler 01",
        performedByRole: Role.ADMIN,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    await expect(
      createMachineUnit({ machineId: machine.id, name: "Boiler 01", performedByRole: Role.STORE_OPERATOR }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects invalid input", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    await expect(
      createMachineUnit({ machineId: machine.id, name: "", performedByRole: Role.ADMIN }),
    ).rejects.toThrow(ValidationError);
  });
});
