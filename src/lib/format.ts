import type { ItemCategory, Criticality, UnitOfMeasure, MovementDirection } from "@/generated/prisma/enums";
import type { StockStatus } from "@/domain/stock/stockStatus";

// Display labels only — preserves docs/UI_REFERENCE.md §7 terminology.
// No business logic here; purely presentational.

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  CAPITAL_SPARES: "Capital Spares",
  OPERATING_SPARES: "Operating Spares",
  ROTABLE_SPARES: "Rotable Spares",
  CONSUMABLES: "Consumables",
  DURABLE_TOOLS: "Durable Tools",
  SAFETY_PPE: "Safety & PPE",
};

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  VITAL: "Vital",
  ESSENTIAL: "Essential",
  DESIRABLE: "Desirable",
};

export const UNIT_LABEL: Record<UnitOfMeasure, string> = {
  EACH: "Each",
  PAIR: "Pair",
  KG: "Kg",
  LITRE: "Litre",
  METER: "Meter",
  SET: "Set",
};

export const STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export const DIRECTION_LABEL: Record<MovementDirection, string> = {
  ADD: "Stock in",
  CONSUME: "Consumption",
  ADJUSTMENT: "Adjustment",
};

export function formatQuantity(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
