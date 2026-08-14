import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine, createTestMachineUnit } from "@/test/fixtures";
import { ForbiddenError, NotFoundError } from "@/domain/errors";
import { updateMachineUnit } from "./updateMachineUnit";

beforeEach(async () => {
  await resetDatabase();
});

describe("updateMachineUnit", () => {
  it("renames a unit", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id, name: "Old Name" });

    const updated = await updateMachineUnit({
      id: unit.id,
      machineId: machine.id,
      name: "New Name",
      performedByRole: Role.STORE_MANAGER,
    });

    expect(updated.name).toBe("New Name");
  });

  it("can re-link a unit to a different machine", async () => {
    const department = await createTestDepartment();
    const machineA = await createTestMachine({ departmentId: department.id });
    const machineB = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machineA.id });

    const updated = await updateMachineUnit({
      id: unit.id,
      machineId: machineB.id,
      name: unit.name,
      performedByRole: Role.ADMIN,
    });

    expect(updated.machineId).toBe(machineB.id);
  });

  it("rejects a nonexistent machine", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id });

    await expect(
      updateMachineUnit({
        id: unit.id,
        machineId: "00000000-0000-0000-0000-000000000000",
        name: unit.name,
        performedByRole: Role.ADMIN,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unknown unit id", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    await expect(
      updateMachineUnit({
        id: "00000000-0000-0000-0000-000000000000",
        machineId: machine.id,
        name: "X",
        performedByRole: Role.ADMIN,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    const unit = await createTestMachineUnit({ machineId: machine.id });
    await expect(
      updateMachineUnit({
        id: unit.id,
        machineId: machine.id,
        name: "New Name",
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
