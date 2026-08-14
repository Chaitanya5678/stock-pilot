import { Prisma } from "@/generated/prisma/client";
import type { ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import { ValidationError } from "@/domain/errors";

type DecimalInput = Prisma.Decimal | number | string;

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

interface CommonFieldsInput {
  name: string;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  category: ItemCategory;
  criticality: Criticality;
  threshold: DecimalInput;
  price: DecimalInput;
}

interface NormalizedCommonFields {
  name: string;
  rack: string;
  unitOfMeasure: UnitOfMeasure;
  category: ItemCategory;
  criticality: Criticality;
  threshold: Prisma.Decimal;
  price: Prisma.Decimal;
}

/**
 * Field-level validation matching docs/BUSINESS_RULES.md §11, shared by
 * create and update — everything except stock, which only create sets (see
 * validateInventoryItemInput) and update never touches (see
 * validateInventoryItemUpdateInput / docs/DECISIONS.md "Product Edit does
 * not change stock"). The reference's HTML `min=1` on threshold conflicts
 * with its own JS check (`>= 0`); this preserves the JS (actually-executed)
 * behaviour and flags the mismatch as an OPEN_QUESTION in
 * docs/BUSINESS_RULES.md rather than silently picking the stricter bound.
 */
function validateCommonFields(input: CommonFieldsInput): NormalizedCommonFields {
  const name = input.name.trim();
  if (!name || name.length > 45) {
    throw new ValidationError("Product name must be between 1 and 45 characters");
  }

  const rack = input.rack.trim();
  if (!rack || rack.length > 30) {
    throw new ValidationError("Rack location must be between 1 and 30 characters");
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
    threshold,
    price,
  };
}

export interface InventoryItemInput extends CommonFieldsInput {
  stock: DecimalInput;
}

export interface NormalizedInventoryItemInput extends NormalizedCommonFields {
  stock: Prisma.Decimal;
}

/** Validates a new item's fields, including its opening stock. */
export function validateInventoryItemInput(input: InventoryItemInput): NormalizedInventoryItemInput {
  const common = validateCommonFields(input);

  const stock = toDecimal(input.stock);
  if (!stock.isFinite() || stock.lessThan(0)) {
    throw new ValidationError("Opening stock must be zero or greater");
  }

  return { ...common, stock };
}

export type InventoryItemUpdateInput = CommonFieldsInput;
export type NormalizedInventoryItemUpdateInput = NormalizedCommonFields;

/**
 * Validates an edit to an existing item's master data. Deliberately has no
 * `stock` field at all — see docs/DECISIONS.md "Product Edit does not
 * change stock". Stock can only change via recordStockMovement.
 */
export function validateInventoryItemUpdateInput(
  input: InventoryItemUpdateInput,
): NormalizedInventoryItemUpdateInput {
  return validateCommonFields(input);
}
