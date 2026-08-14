import { MovementDirection, Role } from "@/generated/prisma/enums";
import { hasPermission, requirePermission, type Permission } from "@/domain/rbac/permissions";
import { ForbiddenError } from "@/domain/errors";

/** Which coarse permission each movement direction requires. */
export const MOVEMENT_PERMISSION: Record<MovementDirection, Permission> = {
  [MovementDirection.ADD]: "stock:add",
  [MovementDirection.CONSUME]: "stock:consume",
  [MovementDirection.ADJUSTMENT]: "stock:adjust",
};

/** The movement directions a role is coarsely permitted to use — for driving UI options. */
export function allowedMovementDirections(role: Role): MovementDirection[] {
  return (Object.keys(MOVEMENT_PERMISSION) as MovementDirection[]).filter((direction) =>
    hasPermission(role, MOVEMENT_PERMISSION[direction]),
  );
}

/**
 * Full authorization check for a movement request: the coarse role→direction
 * permission, plus the one item-attribute-dependent rule from
 * docs/DECISIONS.md "RBAC permission model" — MAINTENANCE_USER may only
 * CONSUME machine-linked items, never store-only inventory. That rule can't
 * be expressed in the flat role→permission map since it also depends on the
 * item, so it lives here instead.
 */
export function assertRoleCanPerformMovement(
  role: Role,
  direction: MovementDirection,
  itemMachineId: string | null,
): void {
  requirePermission(role, MOVEMENT_PERMISSION[direction]);

  if (role === Role.MAINTENANCE_USER && direction === MovementDirection.CONSUME && !itemMachineId) {
    throw new ForbiddenError("Maintenance users may only consume machine-linked inventory items");
  }
}
