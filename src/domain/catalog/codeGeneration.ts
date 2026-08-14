import { ItemCategory, Criticality } from "@/generated/prisma/enums";

const CATEGORY_CODE: Record<ItemCategory, string> = {
  CAPITAL_SPARES: "CSP",
  OPERATING_SPARES: "OSP",
  ROTABLE_SPARES: "RSP",
  CONSUMABLES: "CON",
  DURABLE_TOOLS: "DTL",
  SAFETY_PPE: "PPE",
};

const CRITICALITY_CODE: Record<Criticality, string> = {
  VITAL: "V",
  ESSENTIAL: "E",
  DESIRABLE: "D",
};

/**
 * Derives a 3-letter code from a name (department/machine), same rule as
 * the reference prototype (docs/BUSINESS_RULES.md §6): strip non-letters,
 * take the first 3, uppercase. Falls back to `fallback` if nothing is left.
 */
export function deriveBaseCode(name: string, fallback: string): string {
  const letters = name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  return letters || fallback;
}

/**
 * De-duplicates a candidate code against already-taken codes by appending an
 * incrementing counter, matching the reference's Department/Machine code
 * generation (docs/BUSINESS_RULES.md §6).
 */
export function dedupeCode(base: string, existingCodes: ReadonlySet<string>): string {
  if (!existingCodes.has(base)) return base;

  let counter = 1;
  let candidate = `${base}${counter}`;
  while (existingCodes.has(candidate)) {
    counter += 1;
    candidate = `${base}${counter}`;
  }
  return candidate;
}

/**
 * Builds a product SKU, matching the reference's makeProductCode format
 * (docs/BUSINESS_RULES.md §5): {dept}-{machine}-{category}-{criticality}-{seq}.
 * `sequence` must come from a DB-safe generator (see the product_code_seq
 * migration) — never a client-held counter.
 */
export function buildSku(
  departmentCode: string,
  machineCode: string,
  category: ItemCategory,
  criticality: Criticality,
  sequence: number | bigint,
): string {
  return `${departmentCode}-${machineCode}-${CATEGORY_CODE[category]}-${CRITICALITY_CODE[criticality]}-${sequence}`;
}

/**
 * Builds a barcode string in the same fake-GS1-like shape as the reference
 * (docs/BUSINESS_RULES.md §5). This is a display convention, not a real
 * barcode-standard checksum.
 */
export function buildBarcode(sequence: number | bigint): string {
  return `8901001${String(sequence).padStart(6, "0")}`;
}
