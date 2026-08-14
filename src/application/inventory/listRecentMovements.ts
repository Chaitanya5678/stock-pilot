import type { Role, MovementDirection } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";

export interface MovementView {
  id: string;
  itemName: string;
  itemSku: string;
  direction: MovementDirection;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  machineUnitName: string | null;
  performedByName: string;
  employeeLabel: string | null;
  createdAt: string;
}

/** Read model for the movement/history panel — most recent movements first. */
export async function listRecentMovements(role: Role, limit = 25): Promise<MovementView[]> {
  requirePermission(role, "catalog:view");

  const movements = await prisma.stockMovement.findMany({
    include: { item: true, machineUnit: true, performedBy: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return movements.map((movement) => ({
    id: movement.id,
    itemName: movement.item.name,
    itemSku: movement.item.sku,
    direction: movement.direction,
    quantity: movement.quantity.toNumber(),
    balanceAfter: movement.balanceAfter.toNumber(),
    reason: movement.reason,
    machineUnitName: movement.machineUnit?.name ?? null,
    performedByName: movement.performedBy.displayName,
    employeeLabel: movement.employeeLabel,
    createdAt: movement.createdAt.toISOString(),
  }));
}
