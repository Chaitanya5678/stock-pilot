import type { Role, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { stockStatus, type StockStatus } from "@/domain/stock/stockStatus";

export interface LowStockAlertView {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  criticality: Criticality;
  stock: number;
  threshold: number;
  unitOfMeasure: UnitOfMeasure;
  status: StockStatus;
}

/**
 * Read model for the "Low stock alerts" sidebar card (docs/UI_REFERENCE.md
 * §2, card 1). Reuses the same `stockStatus` domain rule as
 * `listInventoryItems` — no second definition of "low stock" — and issues a
 * single query (no per-item lookups). Excludes IN_STOCK items; sorted
 * ascending by stock, matching the reference exactly. Deliberately does not
 * include the reference's "usage rate" figure — that's an all-time
 * consumption-history computation categorized under Analytics
 * (docs/BUSINESS_RULES.md §10), out of scope for this read-only alert card.
 */
export async function listLowStockAlerts(role: Role): Promise<LowStockAlertView[]> {
  requirePermission(role, "catalog:view");

  const items = await prisma.inventoryItem.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      criticality: true,
      stock: true,
      threshold: true,
      unitOfMeasure: true,
    },
    orderBy: { stock: "asc" },
  });

  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      criticality: item.criticality,
      stock: item.stock.toNumber(),
      threshold: item.threshold.toNumber(),
      unitOfMeasure: item.unitOfMeasure,
      status: stockStatus(item.stock, item.threshold),
    }))
    .filter((item) => item.status !== "IN_STOCK");
}
