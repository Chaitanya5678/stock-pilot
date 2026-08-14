import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateMachineInput } from "@/domain/machines/machineValidation";
import { deriveBaseCode, dedupeCode } from "@/domain/catalog/codeGeneration";
import { ConflictError, NotFoundError } from "@/domain/errors";

export interface CreateMachineInput {
  name: string;
  departmentId: string;
  cost: number | string;
  vendor?: string | null;
  warrantyUntil?: string | null;
  performedByRole: Role;
}

export async function createMachine(input: CreateMachineInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateMachineInput(input);

  return prisma.$transaction(async (tx) => {
    const department = await tx.department.findUnique({ where: { id: input.departmentId } });
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    const existingCodes = new Set((await tx.machine.findMany({ select: { code: true } })).map((m) => m.code));
    const code = dedupeCode(deriveBaseCode(normalized.name, "MCH"), existingCodes);

    try {
      return await tx.machine.create({
        data: {
          name: normalized.name,
          code,
          departmentId: department.id,
          cost: normalized.cost,
          vendor: normalized.vendor,
          warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A machine with this code already exists");
      }
      throw error;
    }
  });
}
