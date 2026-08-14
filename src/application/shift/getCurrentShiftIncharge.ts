import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { deriveInchargeAt } from "@/domain/shift/inchargeDerivation";

export interface CurrentShiftIncharge {
  inchargeId: string | null;
  asOf: string;
}

/**
 * Derives "who is in charge right now" using the existing tested domain
 * function (docs/BUSINESS_RULES.md §8) rather than recomputing the rule
 * here or in the UI. `recordStockMovement` independently does an equivalent
 * `findFirst`-ordered query for its own snapshot purposes (unrelated to
 * this read path) — see docs/DECISIONS.md "Shift in-charge current-state
 * query reuses the existing derivation function".
 */
export async function getCurrentShiftIncharge(role: Role): Promise<CurrentShiftIncharge> {
  requirePermission(role, "catalog:view");

  // Ascending createdAt, per deriveInchargeAt's documented tie-break contract.
  const entries = await prisma.shiftInchargeEntry.findMany({ orderBy: { createdAt: "asc" } });
  const now = new Date();

  const inchargeId = deriveInchargeAt(
    entries.map((entry) => ({ inchargeId: entry.inchargeId, effectiveAt: entry.effectiveAt })),
    now,
  );

  return { inchargeId, asOf: now.toISOString() };
}
