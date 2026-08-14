import { Prisma } from "@/generated/prisma/client";
import { MovementDirection } from "@/generated/prisma/enums";
import { ValidationError } from "@/domain/errors";

type DecimalInput = Prisma.Decimal | number | string;

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export interface StockMovementRequestInput {
  direction: MovementDirection;
  quantity: DecimalInput;
  /** Required for ADJUSTMENT (docs/BUSINESS_RULES.md §3, DECISIONS.md). */
  reason?: string | null;
  /** Supplied machine unit, if any — only meaningful for CONSUME. */
  machineUnitId?: string | null;
  /** The item's own machineId, or null if it is unlinked "store inventory". */
  itemMachineId: string | null;
  /** The parent machine of the supplied machine unit, if one was supplied. */
  machineUnitMachineId?: string | null;
}

export interface ValidatedStockMovement {
  direction: MovementDirection;
  /** Magnitude for ADD/CONSUME (always > 0); signed delta for ADJUSTMENT. */
  quantity: Prisma.Decimal;
  reason: string | null;
  machineUnitId: string | null;
}

/**
 * Validates a stock movement request against the rules in
 * docs/BUSINESS_RULES.md §2 (add/consume) and docs/DECISIONS.md (adjustment).
 * Pure and framework-free — does not touch the database. The caller is
 * responsible for resolving itemMachineId/machineUnitMachineId beforehand
 * and for performing the actual balance update.
 */
export function validateStockMovementRequest(
  input: StockMovementRequestInput,
): ValidatedStockMovement {
  const quantity = toDecimal(input.quantity);

  if (input.direction === MovementDirection.ADD || input.direction === MovementDirection.CONSUME) {
    if (!quantity.isFinite() || quantity.lessThanOrEqualTo(0)) {
      throw new ValidationError("Quantity must be a positive number for add/consume movements");
    }
  } else if (input.direction === MovementDirection.ADJUSTMENT) {
    if (!quantity.isFinite() || quantity.isZero()) {
      throw new ValidationError("Adjustment quantity must be a non-zero number");
    }
    if (!input.reason || !input.reason.trim()) {
      throw new ValidationError("An adjustment must include a reason");
    }
  } else {
    throw new ValidationError(`Unknown movement direction: ${String(input.direction)}`);
  }

  if (input.direction === MovementDirection.CONSUME) {
    // Machine-linked items must consume against a unit of the same machine
    // model; store-only items must not reference a machine unit at all.
    if (input.itemMachineId) {
      if (!input.machineUnitId) {
        throw new ValidationError("A machine unit is required to consume this item");
      }
      if (input.machineUnitMachineId !== input.itemMachineId) {
        throw new ValidationError("The selected machine unit does not belong to this item's machine model");
      }
    } else if (input.machineUnitId) {
      throw new ValidationError("This item is not linked to a machine and cannot be consumed against a machine unit");
    }
  } else if (input.machineUnitId) {
    throw new ValidationError("A machine unit can only be supplied for consume movements");
  }

  return {
    direction: input.direction,
    quantity: input.direction === MovementDirection.ADJUSTMENT ? quantity : quantity.abs(),
    reason: input.direction === MovementDirection.ADJUSTMENT ? (input.reason as string).trim() : null,
    machineUnitId: input.direction === MovementDirection.CONSUME ? (input.machineUnitId ?? null) : null,
  };
}

/** Signed change to apply to the item's stock balance for a validated movement. */
export function movementDelta(direction: MovementDirection, quantity: Prisma.Decimal): Prisma.Decimal {
  if (direction === MovementDirection.ADD) return quantity;
  if (direction === MovementDirection.CONSUME) return quantity.negated();
  return quantity; // ADJUSTMENT: quantity is already a signed delta
}

/**
 * Stock must never go negative, for any movement direction — see
 * docs/BUSINESS_RULES.md §2 and docs/DECISIONS.md "Stock movement model".
 * The application layer additionally enforces this atomically at the
 * database level to guard against concurrent movements.
 */
export function isValidResultingStock(currentStock: DecimalInput, delta: Prisma.Decimal): boolean {
  return toDecimal(currentStock).plus(delta).greaterThanOrEqualTo(0);
}
