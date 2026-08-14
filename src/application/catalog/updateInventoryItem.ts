import type { ItemCategory, Criticality, UnitOfMeasure, Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateInventoryItemUpdateInput } from "@/domain/catalog/productValidation";
import { NotFoundError } from "@/domain/errors";

export interface UpdateInventoryItemInput {
  id: string;
  name: string;
  departmentId: string;
  machineId: string | null;
  category: ItemCategory;
  criticality: Criticality;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  threshold: number | string;
  price: number | string;
  performedByRole: Role;
}

/**
 * Edits a catalog item's master data. There is deliberately no `stock`
 * parameter anywhere in this function's input type or its Prisma `data`
 * object — see docs/DECISIONS.md "Product Edit does not change stock".
 * SKU/barcode are left untouched, matching the reference (editing a
 * category/criticality does not regenerate the code — see docs/DOMAIN.md).
 */
export async function updateInventoryItem(input: UpdateInventoryItemInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateInventoryItemUpdateInput(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundError("Inventory item not found");
    }

    const department = await tx.department.findUnique({ where: { id: input.departmentId } });
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    const machine = input.machineId
      ? await tx.machine.findUnique({ where: { id: input.machineId } })
      : null;
    if (input.machineId && !machine) {
      throw new NotFoundError("Machine not found");
    }

    return tx.inventoryItem.update({
      where: { id: existing.id },
      data: {
        name: normalized.name,
        departmentId: department.id,
        machineId: machine?.id ?? null,
        category: normalized.category,
        criticality: normalized.criticality,
        rack: normalized.rack,
        unitOfMeasure: normalized.unitOfMeasure,
        threshold: normalized.threshold,
        price: normalized.price,
      },
    });
  });
}
