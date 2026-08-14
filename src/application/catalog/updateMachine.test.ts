import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine } from "@/test/fixtures";
import { ForbiddenError, NotFoundError } from "@/domain/errors";
import { updateMachine } from "./updateMachine";

beforeEach(async () => {
  await resetDatabase();
});

describe("updateMachine", () => {
  it("edits a machine's fields without regenerating its code", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id, name: "Old Name", code: "OLD" });

    const updated = await updateMachine({
      id: machine.id,
      name: "New Name",
      departmentId: department.id,
      cost: 500,
      vendor: "New Vendor",
      performedByRole: Role.STORE_MANAGER,
    });

    expect(updated.name).toBe("New Name");
    expect(updated.code).toBe("OLD");
    expect(updated.cost.toNumber()).toBe(500);
  });

  it("can move a machine to a different department", async () => {
    const departmentA = await createTestDepartment();
    const departmentB = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: departmentA.id });

    const updated = await updateMachine({
      id: machine.id,
      name: machine.name,
      departmentId: departmentB.id,
      cost: 0,
      performedByRole: Role.ADMIN,
    });

    expect(updated.departmentId).toBe(departmentB.id);
  });

  it("rejects a nonexistent department", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });

    await expect(
      updateMachine({
        id: machine.id,
        name: machine.name,
        departmentId: "00000000-0000-0000-0000-000000000000",
        cost: 0,
        performedByRole: Role.ADMIN,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unknown machine id", async () => {
    const department = await createTestDepartment();
    await expect(
      updateMachine({
        id: "00000000-0000-0000-0000-000000000000",
        name: "X",
        departmentId: department.id,
        cost: 0,
        performedByRole: Role.ADMIN,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });
    await expect(
      updateMachine({
        id: machine.id,
        name: machine.name,
        departmentId: department.id,
        cost: 0,
        performedByRole: Role.MAINTENANCE_USER,
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
