import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment } from "@/test/fixtures";
import { ConflictError, ForbiddenError, ValidationError } from "@/domain/errors";
import { createDepartment } from "./createDepartment";

beforeEach(async () => {
  await resetDatabase();
});

describe("createDepartment", () => {
  it("creates a department with a derived, deduplicated code", async () => {
    const department = await createDepartment({ name: "Maintenance", performedByRole: Role.STORE_MANAGER });
    expect(department.name).toBe("Maintenance");
    expect(department.code).toBe("MAI");
  });

  it("deduplicates the code when the base is already taken", async () => {
    await createTestDepartment({ name: "Maintenance A", code: "MAI" });
    const department = await createDepartment({ name: "Maintenance B", performedByRole: Role.ADMIN });
    expect(department.code).toBe("MAI1");
  });

  it("rejects a case-insensitive duplicate name", async () => {
    await createTestDepartment({ name: "Maintenance" });
    await expect(
      createDepartment({ name: "maintenance", performedByRole: Role.STORE_MANAGER }),
    ).rejects.toThrow(ConflictError);
  });

  it("rejects an unauthorized role", async () => {
    await expect(
      createDepartment({ name: "Maintenance", performedByRole: Role.STORE_OPERATOR }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects invalid input", async () => {
    await expect(createDepartment({ name: "", performedByRole: Role.ADMIN })).rejects.toThrow(ValidationError);
  });
});
