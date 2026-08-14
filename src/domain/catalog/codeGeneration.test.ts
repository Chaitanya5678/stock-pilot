import { describe, expect, it } from "vitest";
import { ItemCategory, Criticality } from "@/generated/prisma/enums";
import { deriveBaseCode, dedupeCode, buildSku, buildBarcode } from "./codeGeneration";

describe("deriveBaseCode", () => {
  it("takes the first 3 letters, uppercased, stripping non-letters", () => {
    expect(deriveBaseCode("Maintenance", "GEN")).toBe("MAI");
    expect(deriveBaseCode("R&D Lab 2", "GEN")).toBe("RDL");
  });

  it("falls back when nothing letter-like remains", () => {
    expect(deriveBaseCode("123", "GEN")).toBe("GEN");
  });
});

describe("dedupeCode", () => {
  it("returns the base code when unused", () => {
    expect(dedupeCode("MNT", new Set())).toBe("MNT");
  });

  it("appends an incrementing counter until it finds a free code", () => {
    expect(dedupeCode("MNT", new Set(["MNT"]))).toBe("MNT1");
    expect(dedupeCode("MNT", new Set(["MNT", "MNT1", "MNT2"]))).toBe("MNT3");
  });
});

describe("buildSku / buildBarcode", () => {
  it("builds a dash-joined SKU in the reference's format", () => {
    const sku = buildSku("MNT", "CMP", ItemCategory.OPERATING_SPARES, Criticality.VITAL, 1008);
    expect(sku).toBe("MNT-CMP-OSP-V-1008");
  });

  it("builds a zero-padded fake-GS1 barcode", () => {
    expect(buildBarcode(1008)).toBe("8901001001008");
    expect(buildBarcode(7)).toBe("8901001000007");
  });

  it("produces different SKUs for different sequence values with identical other fields", () => {
    const first = buildSku("MNT", "CMP", ItemCategory.OPERATING_SPARES, Criticality.VITAL, 1);
    const second = buildSku("MNT", "CMP", ItemCategory.OPERATING_SPARES, Criticality.VITAL, 2);
    expect(first).not.toBe(second);
  });
});
