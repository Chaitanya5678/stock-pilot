"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";
import type { SessionPayload } from "@/infrastructure/auth/session";
import { recordShiftEntry } from "@/application/shift/recordShiftEntry";
import { mapDomainError } from "@/lib/mapDomainError";

export type ShiftActionResult = { ok: true; id: string } | { ok: false; error: string };

const shiftEntrySchema = z.object({
  inchargeId: z.string().min(1),
  effectiveAt: z.string().min(1),
});

/** Callable directly from tests with an explicit session — see src/app/inventory/actions.ts for why. */
export async function performRecordShiftEntry(session: SessionPayload, rawInput: unknown): Promise<ShiftActionResult> {
  const parsed = shiftEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please check the shift details and try again." };
  }

  try {
    const entry = await recordShiftEntry({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: entry.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function recordShiftEntryAction(rawInput: unknown): Promise<ShiftActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: "You must be logged in to record a shift entry." };
  }
  const result = await performRecordShiftEntry(session, rawInput);
  if (result.ok) {
    revalidatePath("/inventory");
  }
  return result;
}
