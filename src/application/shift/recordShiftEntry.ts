import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";
import { validateShiftEntryInput } from "@/domain/shift/shiftValidation";

export interface RecordShiftEntryInput {
  inchargeId: string;
  effectiveAt: string;
  performedByRole: Role;
}

/**
 * Records a new shift in-charge entry. Append-only, matching the reference
 * (docs/DOMAIN.md §7) — no update/delete, no overlap/uniqueness check.
 *
 * Deliberately does not persist who (which authenticated user) recorded the
 * entry: `ShiftInchargeEntry` has no such column, and adding one merely
 * because authentication now exists is explicitly out of scope for this
 * phase — see docs/DECISIONS.md "Shift in-charge stays free-text, no audit
 * actor column added". Authorization is still enforced server-side via
 * `performedByRole`; it just isn't written to the row.
 */
export async function recordShiftEntry(input: RecordShiftEntryInput) {
  requirePermission(input.performedByRole, "catalog:manage");

  const normalized = validateShiftEntryInput(input);

  return prisma.shiftInchargeEntry.create({
    data: { inchargeId: normalized.inchargeId, effectiveAt: normalized.effectiveAt },
  });
}
