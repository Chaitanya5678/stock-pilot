import { describe, expect, it } from "vitest";
import { ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import { ValidationError } from "@/domain/errors";
import { validateInventoryItemInput } from "./productValidation";

function validInput(overrides: Partial<Parameters<typeof validateInventoryItemInput>[0]> = {}) {
  return {
    name: "Bearing, Ball, Sealed",
    rack: "A-03-12",
    unitOfMeasure: UnitOfMeasure.EACH,
    category: ItemCategory.OPERATING_SPARES,
    criticality: Criticality.VITAL,
    stock: 10,
    threshold: 5,
    price: 9.99,
    ...overrides,
  };
}

describe("validateInventoryItemInput", () => {
  it("accepts a well-formed item", () => {
    const result = validateInventoryItemInput(validInput());
    expect(result.name).toBe("Bearing, Ball, Sealed");
    expect(result.stock.toNumber()).toBe(10);
  });

  it("rejects an empty or overlong name", () => {
    expect(() => validateInventoryItemInput(validInput({ name: "  " }))).toThrow(ValidationError);
    expect(() => validateInventoryItemInput(validInput({ name: "x".repeat(46) }))).toThrow(ValidationError);
  });

  it("rejects an empty or overlong rack", () => {
    expect(() => validateInventoryItemInput(validInput({ rack: "" }))).toThrow(ValidationError);
    expect(() => validateInventoryItemInput(validInput({ rack: "x".repeat(31) }))).toThrow(ValidationError);
  });

  it("rejects negative stock, threshold, or price", () => {
    expect(() => validateInventoryItemInput(validInput({ stock: -1 }))).toThrow(/stock/i);
    expect(() => validateInventoryItemInput(validInput({ threshold: -1 }))).toThrow(/threshold/i);
    expect(() => validateInventoryItemInput(validInput({ price: -1 }))).toThrow(/price/i);
  });

  it("allows a zero threshold (preserves the reference's actually-enforced JS rule — see docs/BUSINESS_RULES.md §11)", () => {
    expect(() => validateInventoryItemInput(validInput({ threshold: 0 }))).not.toThrow();
  });
});
