import { prisma } from "@/infrastructure/db/prismaClient";
import { hashPassword } from "@/infrastructure/auth/password";
import { Role, ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}`;
}

export async function createTestUser(overrides: {
  role?: Role;
  email?: string;
  password?: string;
  displayName?: string;
  isActive?: boolean;
} = {}) {
  const password = overrides.password ?? "test-password-123";
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${unique("user")}@example.test`,
      passwordHash: await hashPassword(password),
      displayName: overrides.displayName ?? "Test User",
      role: overrides.role ?? Role.STORE_OPERATOR,
      isActive: overrides.isActive ?? true,
      isSeedUser: true,
    },
  });
}

export async function createTestDepartment(overrides: { name?: string; code?: string } = {}) {
  return prisma.department.create({
    data: {
      name: overrides.name ?? unique("Department "),
      code: overrides.code ?? unique("D"),
    },
  });
}

export async function createTestMachine(overrides: { departmentId: string; name?: string; code?: string }) {
  return prisma.machine.create({
    data: {
      name: overrides.name ?? unique("Machine "),
      code: overrides.code ?? unique("M"),
      departmentId: overrides.departmentId,
    },
  });
}

export async function createTestMachineUnit(overrides: { machineId: string; name?: string }) {
  return prisma.machineUnit.create({
    data: {
      machineId: overrides.machineId,
      name: overrides.name ?? unique("Unit "),
    },
  });
}

export async function createTestInventoryItem(overrides: {
  departmentId: string;
  machineId?: string | null;
  name?: string;
  sku?: string;
  barcode?: string;
  category?: ItemCategory;
  criticality?: Criticality;
  rack?: string;
  unitOfMeasure?: UnitOfMeasure;
  stock?: number;
  threshold?: number;
  price?: number;
}) {
  const seq = unique("");
  return prisma.inventoryItem.create({
    data: {
      name: overrides.name ?? `Test Item ${seq}`,
      sku: overrides.sku ?? `TST-${seq}`,
      barcode: overrides.barcode ?? `TESTBARCODE${seq}`,
      departmentId: overrides.departmentId,
      machineId: overrides.machineId ?? null,
      category: overrides.category ?? ItemCategory.OPERATING_SPARES,
      criticality: overrides.criticality ?? Criticality.ESSENTIAL,
      rack: overrides.rack ?? "A-01-01",
      unitOfMeasure: overrides.unitOfMeasure ?? UnitOfMeasure.EACH,
      stock: overrides.stock ?? 10,
      threshold: overrides.threshold ?? 5,
      price: overrides.price ?? 9.99,
    },
  });
}
