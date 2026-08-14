import { Prisma } from "@/generated/prisma/client";
import type { ItemCategory, Criticality, UnitOfMeasure, Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateInventoryItemInput } from "@/domain/catalog/productValidation";
import { buildSku, buildBarcode } from "@/domain/catalog/codeGeneration";
import { NotFoundError, ConflictError } from "@/domain/errors";

export interface CreateInventoryItemInput {
  name: string;
  departmentId: string;
  machineId: string | null;
  category: ItemCategory;
  criticality: Criticality;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  stock: number | string;
  threshold: number | string;
  price: number | string;
  performedByRole: Role;
}

/**
 * Creates a catalog item with a DB-generated SKU/barcode (docs/DECISIONS.md
 * "Identifiers"). Does not touch stock movements — opening stock is set
 * directly at creation time since the item does not exist yet to have a
 * movement history against (there is nothing to consume/add relative to).
 */
export async function createInventoryItem(input: CreateInventoryItemInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateInventoryItemInput(input);

  return prisma.$transaction(async (tx) => {
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

    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('product_code_seq')`;

    const sku = buildSku(department.code, machine?.code ?? "GEN", input.category, input.criticality, nextval);
    const barcode = buildBarcode(nextval);

    try {
      return await tx.inventoryItem.create({
        data: {
          name: normalized.name,
          sku,
          barcode,
          departmentId: department.id,
          machineId: machine?.id ?? null,
          category: input.category,
          criticality: input.criticality,
          rack: normalized.rack,
          unitOfMeasure: input.unitOfMeasure,
          stock: normalized.stock,
          threshold: normalized.threshold,
          price: normalized.price,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Generated SKU or barcode collided with an existing item");
      }
      throw error;
    }
  });
}
