import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateMachineUnitInput } from "@/domain/machines/machineValidation";
import { NotFoundError } from "@/domain/errors";

export interface CreateMachineUnitInput {
  machineId: string;
  name: string;
  performedByRole: Role;
}

export async function createMachineUnit(input: CreateMachineUnitInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateMachineUnitInput(input);

  return prisma.$transaction(async (tx) => {
    const machine = await tx.machine.findUnique({ where: { id: input.machineId } });
    if (!machine) {
      throw new NotFoundError("Machine not found");
    }

    return tx.machineUnit.create({ data: { machineId: machine.id, name: normalized.name } });
  });
}
