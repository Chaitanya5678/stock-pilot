import { Prisma } from "@/generated/prisma/client";
import type { ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import { ValidationError } from "@/domain/errors";

type DecimalInput = Prisma.Decimal | number | string;

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export interface InventoryItemInput {
  name: string;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  category: ItemCategory;
  criticality: Criticality;
  stock: DecimalInput;
  threshold: DecimalInput;
  price: DecimalInput;
}

export interface NormalizedInventoryItemInput {
  name: string;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  category: ItemCategory;
  criticality: Criticality;
  stock: Prisma.Decimal;
  threshold: Prisma.Decimal;
  price: Prisma.Decimal;
}

/**
 * Field-level validation matching docs/BUSINESS_RULES.md §11. The
 * reference's HTML `min=1` on threshold conflicts with its own JS check
 * (`>= 0`); this preserves the JS (actually-executed) behaviour and flags
 * the mismatch as an OPEN_QUESTION in docs/BUSINESS_RULES.md rather than
 * silently picking the stricter bound.
 */
export function validateInventoryItemInput(input: InventoryItemInput): NormalizedInventoryItemInput {
  const name = input.name.trim();
  if (!name || name.length > 45) {
    throw new ValidationError("Product name must be between 1 and 45 characters");
  }

  const rack = input.rack.trim();
  if (!rack || rack.length > 30) {
    throw new ValidationError("Rack location must be between 1 and 30 characters");
  }

  const stock = toDecimal(input.stock);
  if (!stock.isFinite() || stock.lessThan(0)) {
    throw new ValidationError("Opening stock must be zero or greater");
  }

  const threshold = toDecimal(input.threshold);
  if (!threshold.isFinite() || threshold.lessThan(0)) {
    throw new ValidationError("Low-stock threshold must be zero or greater");
  }

  const price = toDecimal(input.price);
  if (!price.isFinite() || price.lessThan(0)) {
    throw new ValidationError("Price must be zero or greater");
  }

  return {
    name,
    rack,
    unitOfMeasure: input.unitOfMeasure,
    category: input.category,
    criticality: input.criticality,
    stock,
    threshold,
    price,
  };
}
