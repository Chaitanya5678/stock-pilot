import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";

export interface ShiftEntryView {
  id: string;
  inchargeId: string;
  effectiveAt: string;
}

/** Most recent shift entries first, for the history list — matches docs/UI_REFERENCE.md §2 ("5 most recent, desc by timestamp"). */
export async function listShiftEntries(role: Role, limit = 5): Promise<ShiftEntryView[]> {
  requirePermission(role, "catalog:view");

  const entries = await prisma.shiftInchargeEntry.findMany({
    orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return entries.map((entry) => ({
    id: entry.id,
    inchargeId: entry.inchargeId,
    effectiveAt: entry.effectiveAt.toISOString(),
  }));
}
