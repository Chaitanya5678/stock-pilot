import { ValidationError } from "@/domain/errors";

export interface ShiftEntryInput {
  inchargeId: string;
  effectiveAt: Date | string;
}

export interface NormalizedShiftEntryInput {
  inchargeId: string;
  effectiveAt: Date;
}

/**
 * Field-level validation matching docs/DOMAIN.md §7: `inchargeId` is
 * required free text (no Employee/roster entity), up to 20 characters;
 * `effectiveAt` must be a valid date/time. No future/past bounds and no
 * overlap/uniqueness check — the reference never enforced either, and
 * docs/DOMAIN.md §7 records the tie-break behaviour as an open question
 * rather than a rule to invent here.
 */
export function validateShiftEntryInput(input: ShiftEntryInput): NormalizedShiftEntryInput {
  const inchargeId = input.inchargeId.trim();
  if (!inchargeId || inchargeId.length > 20) {
    throw new ValidationError("In-charge ID must be between 1 and 20 characters");
  }

  const effectiveAt = input.effectiveAt instanceof Date ? input.effectiveAt : new Date(input.effectiveAt);
  if (Number.isNaN(effectiveAt.getTime())) {
    throw new ValidationError("Effective timestamp must be a valid date and time");
  }

  return { inchargeId, effectiveAt };
}
