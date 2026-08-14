import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestDepartment, createTestInventoryItem, createTestMachine, createTestUser } from "@/test/fixtures";
import {
  performCreateDepartment,
  performUpdateDepartment,
  performDeleteDepartment,
  performCreateMachine,
  performCreateMachineUnit,
} from "./actions";

beforeEach(async () => {
  await resetDatabase();
});

async function sessionFor(role: Role) {
  const user = await createTestUser({ role });
  return { userId: user.id, role, email: user.email, displayName: user.displayName };
}

describe("master-data server actions", () => {
  it("creates a department for an authorized session", async () => {
    const session = await sessionFor(Role.STORE_MANAGER);
    const result = await performCreateDepartment(session, { name: "Quality Assurance" });
    expect(result.ok).toBe(true);
  });

  it("rejects department creation for an unauthorized session with a friendly message", async () => {
    const session = await sessionFor(Role.STORE_OPERATOR);
    const result = await performCreateDepartment(session, { name: "Quality Assurance" });
    expect(result).toEqual({ ok: false, error: "You do not have permission to perform this action." });
  });

  it("rejects malformed department input", async () => {
    const session = await sessionFor(Role.ADMIN);
    const result = await performCreateDepartment(session, {});
    expect(result).toEqual({ ok: false, error: "Please check the details and try again." });
  });

  it("updates a department and blocks a duplicate rename with a friendly message", async () => {
    const session = await sessionFor(Role.ADMIN);
    await createTestDepartment({ name: "Existing" });
    const department = await createTestDepartment({ name: "Renamable" });

    const result = await performUpdateDepartment(session, { id: department.id, name: "existing" });
    expect(result.ok).toBe(false);
  });

  it("blocks department deletion when in use, without deleting it", async () => {
    const session = await sessionFor(Role.ADMIN);
    const department = await createTestDepartment();
    await createTestMachine({ departmentId: department.id });

    const result = await performDeleteDepartment(session, { id: department.id });
    expect(result.ok).toBe(false);
    await expect(prisma.department.findUnique({ where: { id: department.id } })).resolves.toBeTruthy();
  });

  it("creates a machine for an authorized session and rejects an invalid department", async () => {
    const session = await sessionFor(Role.STORE_MANAGER);
    const department = await createTestDepartment();

    const ok = await performCreateMachine(session, { name: "Compressor", departmentId: department.id, cost: 0 });
    expect(ok.ok).toBe(true);

    const bad = await performCreateMachine(session, {
      name: "Compressor",
      departmentId: "00000000-0000-0000-0000-000000000000",
      cost: 0,
    });
    expect(bad).toEqual({ ok: false, error: "Department not found" });
  });

  it("creates a machine unit for an authorized session and rejects an invalid machine", async () => {
    const session = await sessionFor(Role.ADMIN);
    const department = await createTestDepartment();
    const machine = await createTestMachine({ departmentId: department.id });

    const ok = await performCreateMachineUnit(session, { machineId: machine.id, name: "Unit 01" });
    expect(ok.ok).toBe(true);

    const bad = await performCreateMachineUnit(session, {
      machineId: "00000000-0000-0000-0000-000000000000",
      name: "Unit 01",
    });
    expect(bad).toEqual({ ok: false, error: "Machine not found" });
  });

  it("does not touch stock when creating master data alongside an existing item", async () => {
    const session = await sessionFor(Role.ADMIN);
    const department = await createTestDepartment();
    const item = await createTestInventoryItem({ departmentId: department.id, stock: 8 });

    await performCreateMachine(session, { name: "New Machine", departmentId: department.id, cost: 0 });

    const reloaded = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(reloaded.stock.toNumber()).toBe(8);
  });
});
