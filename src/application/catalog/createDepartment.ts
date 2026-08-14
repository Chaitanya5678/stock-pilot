import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateDepartmentInput } from "@/domain/catalog/departmentValidation";
import { deriveBaseCode, dedupeCode } from "@/domain/catalog/codeGeneration";
import { ConflictError } from "@/domain/errors";

export interface CreateDepartmentInput {
  name: string;
  performedByRole: Role;
}

/**
 * Department name uniqueness is case-insensitive (docs/BUSINESS_RULES.md
 * §11), but the DB column has a plain (case-sensitive) unique index — so
 * this explicit pre-check is needed to match the documented rule; the DB
 * constraint remains a case-sensitive backstop underneath it.
 */
export async function createDepartment(input: CreateDepartmentInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateDepartmentInput(input);

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.department.findFirst({
      where: { name: { equals: normalized.name, mode: "insensitive" } },
    });
    if (duplicate) {
      throw new ConflictError(`Department "${normalized.name}" already exists`);
    }

    const existingCodes = new Set((await tx.department.findMany({ select: { code: true } })).map((d) => d.code));
    const code = dedupeCode(deriveBaseCode(normalized.name, "DPT"), existingCodes);

    try {
      return await tx.department.create({ data: { name: normalized.name, code } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A department with this name or code already exists");
      }
      throw error;
    }
  });
}
