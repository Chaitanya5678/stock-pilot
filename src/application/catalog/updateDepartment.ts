import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateDepartmentInput } from "@/domain/catalog/departmentValidation";
import { ConflictError, NotFoundError } from "@/domain/errors";

export interface UpdateDepartmentInput {
  id: string;
  name: string;
  performedByRole: Role;
}

/** Renames a department. Its `code` is never regenerated on edit — same fixed-code-after-creation pattern as product SKU/barcode. */
export async function updateDepartment(input: UpdateDepartmentInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateDepartmentInput(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.department.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundError("Department not found");
    }

    const duplicate = await tx.department.findFirst({
      where: { name: { equals: normalized.name, mode: "insensitive" }, NOT: { id: existing.id } },
    });
    if (duplicate) {
      throw new ConflictError(`Department "${normalized.name}" already exists`);
    }

    return tx.department.update({ where: { id: existing.id }, data: { name: normalized.name } });
  });
}
