import { prisma } from "@/infrastructure/db/prismaClient";

/**
 * Truncates every table between integration tests, in FK-safe order
 * (children before parents — every relation in the schema uses onDelete:
 * Restrict). Test-only; never call this outside the test database.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.shiftInchargeEntry.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.machineUnit.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.department.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
