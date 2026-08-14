import { Prisma } from "@/generated/prisma/client";
import { MovementDirection, Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { MOVEMENT_PERMISSION, assertRoleCanPerformMovement } from "@/domain/stock/movementPermissions";
import { validateStockMovementRequest, movementDelta } from "@/domain/stock/movementRules";
import { NotFoundError, InsufficientStockError } from "@/domain/errors";

export interface RecordStockMovementInput {
  itemId: string;
  direction: MovementDirection;
  quantity: number | string;
  machineUnitId?: string | null;
  /** Required when direction is ADJUSTMENT. */
  reason?: string | null;
  /** Optional, non-authoritative display label — see docs/DECISIONS.md "Audit identity". */
  employeeLabel?: string | null;
  performedByUserId: string;
  performedByRole: Role;
}

export interface RecordStockMovementResult {
  movementId: string;
  balanceAfter: Prisma.Decimal;
}

/**
 * The single authoritative entry point for changing an item's stock.
 * Implements docs/BUSINESS_RULES.md §2-3 and the transactional requirement
 * in docs/ARCHITECTURE.md §3: validate → verify item/machine-unit → verify
 * sufficient stock → write the movement → update the balance atomically →
 * commit-or-rollback together. A successful call always produces exactly one
 * StockMovement row and one balance update, or neither.
 */
export async function recordStockMovement(
  input: RecordStockMovementInput,
): Promise<RecordStockMovementResult> {
  // Coarse check first, so an obviously-unauthorized request fails before we
  // even open a transaction.
  requirePermission(input.performedByRole, MOVEMENT_PERMISSION[input.direction]);

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) {
      throw new NotFoundError("Inventory item not found");
    }

    // Full check, including the MAINTENANCE_USER + store-only-item rule,
    // which needs the item we just loaded.
    assertRoleCanPerformMovement(input.performedByRole, input.direction, item.machineId);

    const machineUnit = input.machineUnitId
      ? await tx.machineUnit.findUnique({ where: { id: input.machineUnitId } })
      : null;
    if (input.machineUnitId && !machineUnit) {
      throw new NotFoundError("Machine unit not found");
    }

    const validated = validateStockMovementRequest({
      direction: input.direction,
      quantity: input.quantity,
      reason: input.reason,
      machineUnitId: input.machineUnitId ?? null,
      itemMachineId: item.machineId,
      machineUnitMachineId: machineUnit?.machineId ?? null,
    });

    const delta = movementDelta(validated.direction, validated.quantity);

    // Atomic, concurrency-safe balance update: the WHERE clause re-checks
    // "would this go negative" against the *current* committed row, not a
    // value read earlier in this function, so two concurrent consumes can
    // never both succeed past the available stock. No row updated => reject.
    const updated = await tx.$queryRaw<{ stock: Prisma.Decimal }[]>`
      UPDATE inventory_items
      SET stock = stock + ${delta}, "updatedAt" = now()
      WHERE id = ${item.id} AND stock + ${delta} >= 0
      RETURNING stock
    `;

    if (updated.length === 0) {
      throw new InsufficientStockError("This movement would result in negative stock");
    }

    const balanceAfter = updated[0].stock;

    const incharge = await tx.shiftInchargeEntry.findFirst({
      where: { effectiveAt: { lte: new Date() } },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    });

    const movement = await tx.stockMovement.create({
      data: {
        itemId: item.id,
        machineUnitId: validated.machineUnitId,
        direction: validated.direction,
        quantity: validated.quantity,
        reason: validated.reason,
        balanceAfter,
        performedByUserId: input.performedByUserId,
        employeeLabel: input.employeeLabel?.trim() || null,
        inchargeId: incharge?.inchargeId ?? null,
      },
    });

    return { movementId: movement.id, balanceAfter };
  });
}
