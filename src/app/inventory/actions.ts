"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { MovementDirection } from "@/generated/prisma/enums";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";
import type { SessionPayload } from "@/infrastructure/auth/session";
import { recordStockMovement } from "@/application/stock/recordStockMovement";
import {
  ValidationError,
  NotFoundError,
  InsufficientStockError,
  ForbiddenError,
} from "@/domain/errors";

export type MovementActionResult = { ok: true; balanceAfter: number } | { ok: false; error: string };

const movementInputSchema = z.object({
  itemId: z.string().min(1),
  direction: z.enum([MovementDirection.ADD, MovementDirection.CONSUME, MovementDirection.ADJUSTMENT]),
  quantity: z.coerce.number(),
  machineUnitId: z.string().min(1).optional().nullable(),
  reason: z.string().optional().nullable(),
  employeeLabel: z.string().optional().nullable(),
});

export type MovementFormInput = z.infer<typeof movementInputSchema>;

/**
 * Never let a raw error (DB message, stack trace) reach the browser — map
 * every known domain error to a short user-facing message, and swallow
 * anything else behind a generic one. See PRODUCT spec §7 "Error handling".
 */
function mapError(error: unknown): string {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof InsufficientStockError
  ) {
    return error.message;
  }
  if (error instanceof ForbiddenError) {
    return "You do not have permission to perform this action.";
  }
  console.error("recordMovementAction failed", error);
  return "Something went wrong recording this movement. Please try again.";
}

/**
 * The actual work, factored out from the "use server" export so it's
 * callable directly from tests with an explicit session — getCurrentSession()
 * depends on next/headers' request-scoped cookies() and can't be exercised
 * outside a real Next.js request.
 */
export async function performRecordMovement(
  session: SessionPayload,
  rawInput: unknown,
): Promise<MovementActionResult> {
  const parsed = movementInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please check the movement details and try again." };
  }

  try {
    const result = await recordStockMovement({
      itemId: parsed.data.itemId,
      direction: parsed.data.direction,
      quantity: parsed.data.quantity,
      machineUnitId: parsed.data.machineUnitId ?? null,
      reason: parsed.data.reason ?? null,
      employeeLabel: parsed.data.employeeLabel ?? null,
      performedByUserId: session.userId,
      performedByRole: session.role,
    });
    return { ok: true, balanceAfter: result.balanceAfter.toNumber() };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function recordMovementAction(rawInput: unknown): Promise<MovementActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: "You must be logged in to record a movement." };
  }

  const result = await performRecordMovement(session, rawInput);
  if (result.ok) {
    revalidatePath("/inventory");
  }
  return result;
}
