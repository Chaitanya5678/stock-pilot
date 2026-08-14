import { Prisma } from "@/generated/prisma/client";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

type DecimalInput = Prisma.Decimal | number | string;

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

/**
 * Mirrors the reference prototype's status rule (docs/BUSINESS_RULES.md §1):
 * out = stock <= 0, low = 0 < stock <= threshold, in = stock > threshold.
 */
export function stockStatus(stock: DecimalInput, threshold: DecimalInput): StockStatus {
  const stockValue = toDecimal(stock);
  const thresholdValue = toDecimal(threshold);

  if (stockValue.lessThanOrEqualTo(0)) return "OUT_OF_STOCK";
  if (stockValue.lessThanOrEqualTo(thresholdValue)) return "LOW_STOCK";
  return "IN_STOCK";
}
