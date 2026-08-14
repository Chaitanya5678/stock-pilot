import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestMachine } from "@/test/fixtures";
import { ConflictError, ForbiddenError, NotFoundError } from "@/domain/errors";
import { deleteDepartment } from "./deleteDepartment";

beforeEach(async () => {
  await resetDatabase();
});

describe("deleteDepartment", () => {
  it("deletes an unused department", async () => {
    const department = await createTestDepartment();
    await deleteDepartment({ id: department.id, performedByRole: Role.ADMIN });
    await expect(prisma.department.findUnique({ where: { id: department.id } })).resolves.toBeNull();
  });

  it("blocks deletion when a machine references it, without touching the machine", async () => {
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });

    await expect(deleteDepartment({ id: department.id, performedByRole: Role.ADMIN })).rejects.toThrow(
      ConflictError,
    );

    await expect(prisma.department.findUnique({ where: { id: department.id } })).resolves.toBeTruthy();
    await expect(prisma.machine.findUnique({ where: { id: machine.id } })).resolves.toBeTruthy();
  });

  it("blocks deletion when an inventory item references it", async () => {
    const department = await createTestDepartment();
    await createTestInventoryItem({ departmentId: department.id });

    await expect(deleteDepartment({ id: department.id, performedByRole: Role.ADMIN })).rejects.toThrow(
      /in use/i,
    );
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    await expect(
      deleteDepartment({ id: department.id, performedByRole: Role.STORE_OPERATOR }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects an unknown department id", async () => {
    await expect(
      deleteDepartment({ id: "00000000-0000-0000-0000-000000000000", performedByRole: Role.ADMIN }),
    ).rejects.toThrow(NotFoundError);
  });
});
