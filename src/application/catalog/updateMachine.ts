import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateMachineInput } from "@/domain/machines/machineValidation";
import { NotFoundError } from "@/domain/errors";

export interface UpdateMachineInput {
  id: string;
  name: string;
  departmentId: string;
  cost: number | string;
  vendor?: string | null;
  warrantyUntil?: string | null;
  performedByRole: Role;
}

/** Edits a machine model's master data. `code` is never regenerated on edit. */
export async function updateMachine(input: UpdateMachineInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateMachineInput(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.machine.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundError("Machine not found");
    }

    const department = await tx.department.findUnique({ where: { id: input.departmentId } });
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    return tx.machine.update({
      where: { id: existing.id },
      data: {
        name: normalized.name,
        departmentId: department.id,
        cost: normalized.cost,
        vendor: normalized.vendor,
        warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : null,
      },
    });
  });
}
