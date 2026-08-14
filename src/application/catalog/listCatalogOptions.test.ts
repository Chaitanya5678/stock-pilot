import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestMachine } from "@/test/fixtures";
import { listCatalogOptions } from "./listCatalogOptions";

beforeEach(async () => {
  await resetDatabase();
});

describe("listCatalogOptions", () => {
  it("returns departments and machines for use in the product form", async () => {
    const department = await createTestDepartment({ name: "Utilities", code: "UTL" });
    const machine = await createTestMachine({ departmentId: department.id, name: "Boiler", code: "BOL" });

    const options = await listCatalogOptions(Role.STORE_MANAGER);

    expect(options.departments).toEqual([{ id: department.id, name: "Utilities" }]);
    expect(options.machines).toEqual([
      { id: machine.id, name: "Boiler", code: "BOL", departmentId: department.id },
    ]);
  });
});
