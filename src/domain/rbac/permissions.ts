import { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/domain/errors";

/**
 * Coarse-grained MVP permission set. Deliberately small — see
 * docs/DECISIONS.md "RBAC permission model" for why per-user overrides,
 * multi-role users, and fine-grained action permissions are explicitly out
 * of scope for now.
 */
export type Permission =
  | "stock:add"
  | "stock:consume"
  | "stock:adjust"
  | "catalog:view"
  | "catalog:manage"
  | "users:manage";

// Role -> permission mapping. Only the permissions needed by the foundation
// use-cases implemented so far are exercised in tests; the remaining
// mappings are recorded now so the model doesn't need to be redesigned as
// each feature is built. Refine per docs/MVP_SCOPE.md as features land.
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  [Role.ADMIN]: new Set<Permission>([
    "stock:add",
    "stock:consume",
    "stock:adjust",
    "catalog:view",
    "catalog:manage",
    "users:manage",
  ]),
  [Role.STORE_MANAGER]: new Set<Permission>([
    "stock:add",
    "stock:consume",
    "stock:adjust",
    "catalog:view",
    "catalog:manage",
  ]),
  // Approved (docs/DECISIONS.md "RBAC permission model"): STORE_OPERATOR
  // does not get stock:adjust — adjustment is a corrective operation that
  // requires the stronger accountability of STORE_MANAGER/ADMIN.
  [Role.STORE_OPERATOR]: new Set<Permission>([
    "stock:add",
    "stock:consume",
    "catalog:view",
  ]),
  // MAINTENANCE_USER additionally may only consume machine-linked items —
  // see assertRoleCanPerformMovement in movementPermissions.ts, since that
  // rule depends on the item, not just the role.
  [Role.MAINTENANCE_USER]: new Set<Permission>([
    "stock:consume",
    "catalog:view",
  ]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Role ${role} does not have permission "${permission}"`);
  }
}
