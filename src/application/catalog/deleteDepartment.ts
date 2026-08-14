import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { ConflictError, NotFoundError } from "@/domain/errors";

export interface DeleteDepartmentInput {
  id: string;
  performedByRole: Role;
}

/**
 * Deletes a department only if nothing references it — matches the
 * reference's exact guard (docs/BUSINESS_RULES.md §7) and is the only
 * delete operation in this phase (docs/DECISIONS.md "Product
 * delete/deactivate" left Machine/MachineUnit/InventoryItem deletion out of
 * scope entirely). Never cascades: machines, machine units, inventory
 * items, and stock movements are never touched by this function.
 */
export async function deleteDepartment(input: DeleteDepartmentInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  return prisma.$transaction(async (tx) => {
    const department = await tx.department.findUnique({
      where: { id: input.id },
      include: { _count: { select: { machines: true, items: true } } },
    });
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    if (department._count.machines > 0 || department._count.items > 0) {
      throw new ConflictError(
        `Cannot remove "${department.name}": in use (${department._count.items} items, ${department._count.machines} machines)`,
      );
    }

    try {
      await tx.department.delete({ where: { id: department.id } });
    } catch (error) {
      // Defense in depth against a dependent record inserted between the
      // count check above and this delete (onDelete: Restrict in the
      // schema is the actual backstop) — never let this surface as a raw
      // constraint error.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ConflictError(`Cannot remove "${department.name}": it is still in use`);
      }
      throw error;
    }
  });
}
