import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment } from "@/test/fixtures";
import { ConflictError, ForbiddenError, NotFoundError } from "@/domain/errors";
import { updateDepartment } from "./updateDepartment";

beforeEach(async () => {
  await resetDatabase();
});

describe("updateDepartment", () => {
  it("renames a department without changing its code", async () => {
    const department = await createTestDepartment({ name: "Old Name", code: "OLD" });

    const updated = await updateDepartment({ id: department.id, name: "New Name", performedByRole: Role.ADMIN });

    expect(updated.name).toBe("New Name");
    expect(updated.code).toBe("OLD");
  });

  it("rejects renaming to a name already used by another department", async () => {
    await createTestDepartment({ name: "Taken" });
    const department = await createTestDepartment({ name: "Original" });

    await expect(
      updateDepartment({ id: department.id, name: "taken", performedByRole: Role.STORE_MANAGER }),
    ).rejects.toThrow(ConflictError);
  });

  it("allows renaming to its own current name (case variant)", async () => {
    const department = await createTestDepartment({ name: "Utilities" });
    await expect(
      updateDepartment({ id: department.id, name: "Utilities", performedByRole: Role.ADMIN }),
    ).resolves.toBeTruthy();
  });

  it("rejects an unauthorized role", async () => {
    const department = await createTestDepartment();
    await expect(
      updateDepartment({ id: department.id, name: "New Name", performedByRole: Role.MAINTENANCE_USER }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects an unknown department id", async () => {
    await expect(
      updateDepartment({ id: "00000000-0000-0000-0000-000000000000", name: "X", performedByRole: Role.ADMIN }),
    ).rejects.toThrow(NotFoundError);
  });
});
