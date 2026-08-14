import type { Role, ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { stockStatus, type StockStatus } from "@/domain/stock/stockStatus";

export interface InventoryItemView {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  department: string;
  category: ItemCategory;
  criticality: Criticality;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  stock: number;
  threshold: number;
  status: StockStatus;
  machine: { id: string; name: string } | null;
  machineUnits: { id: string; name: string }[];
}

/**
 * Read model for the inventory list/lookup UI. Joins department and
 * machine/machine-unit so the client has everything it needs (including the
 * candidate machine units for the movement form) without a second request.
 */
export async function listInventoryItems(role: Role): Promise<InventoryItemView[]> {
  requirePermission(role, "catalog:view");

  const items = await prisma.inventoryItem.findMany({
    include: {
      department: true,
      machine: { include: { units: { orderBy: { name: "asc" } } } },
    },
    orderBy: { name: "asc" },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    department: item.department.name,
    category: item.category,
    criticality: item.criticality,
    rack: item.rack,
    unitOfMeasure: item.unitOfMeasure,
    stock: item.stock.toNumber(),
    threshold: item.threshold.toNumber(),
    status: stockStatus(item.stock, item.threshold),
    machine: item.machine ? { id: item.machine.id, name: item.machine.name } : null,
    machineUnits: item.machine ? item.machine.units.map((unit) => ({ id: unit.id, name: unit.name })) : [],
  }));
}
