import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment } from "@/test/fixtures";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { createMachine } from "./createMachine";

beforeEach(async () => {
  await resetDatabase();
});

describe("createMachine", () => {
  it("creates a machine linked to an existing department, with a derived code", async () => {
    const department = await createTestDepartment({ name: "Utilities" });

    const machine = await createMachine({
      name: "Boiler, High Pressure",
      departmentId: department.id,
      cost: 1000,
      vendor: "Thermal Systems Ltd.",
      performedByRole: Role.STORE_MANAGER,
    });

    expect(machine.code).toBe("BOI");
    expect(machine.departmentId).toBe(department.id);
  });

  it("rejects a machine that references a nonexistent department", async () => {
    await expect(
      createMachine({
        name: "Boiler",
        departmentId: "00000000-0000-0000-0000-000000000000",
        cost: 0,
        performedByRole: Role.ADMIN,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    await expect(
      createMachine({ name: "Boiler", departmentId: department.id, cost: 0, performedByRole: Role.STORE_OPERATOR }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects invalid input", async () => {
    const department = await createTestDepartment();
    await expect(
      createMachine({ name: "", departmentId: department.id, cost: 0, performedByRole: Role.ADMIN }),
    ).rejects.toThrow(ValidationError);
    await expect(
      createMachine({ name: "Boiler", departmentId: department.id, cost: -1, performedByRole: Role.ADMIN }),
    ).rejects.toThrow(ValidationError);
  });
});
