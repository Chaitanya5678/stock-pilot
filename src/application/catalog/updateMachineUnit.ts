import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateMachineUnitInput } from "@/domain/machines/machineValidation";
import { NotFoundError } from "@/domain/errors";

export interface UpdateMachineUnitInput {
  id: string;
  machineId: string;
  name: string;
  performedByRole: Role;
}

export async function updateMachineUnit(input: UpdateMachineUnitInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateMachineUnitInput(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.machineUnit.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundError("Machine unit not found");
    }

    const machine = await tx.machine.findUnique({ where: { id: input.machineId } });
    if (!machine) {
      throw new NotFoundError("Machine not found");
    }

    return tx.machineUnit.update({
      where: { id: existing.id },
      data: { machineId: machine.id, name: normalized.name },
    });
  });
}
