import { Prisma } from "@/generated/prisma/client";
import { ValidationError } from "@/domain/errors";

type DecimalInput = Prisma.Decimal | number | string;

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export interface MachineInput {
  name: string;
  cost: DecimalInput;
  vendor?: string | null;
}

export interface NormalizedMachineInput {
  name: string;
  cost: Prisma.Decimal;
  vendor: string | null;
}

/** docs/BUSINESS_RULES.md §11: machine name required <=60 chars, cost >= 0. Name uniqueness is not enforced (OPEN_QUESTION, docs/DOMAIN.md §3). */
export function validateMachineInput(input: MachineInput): NormalizedMachineInput {
  const name = input.name.trim();
  if (!name || name.length > 60) {
    throw new ValidationError("Machine model name must be between 1 and 60 characters");
  }

  const cost = toDecimal(input.cost);
  if (!cost.isFinite() || cost.lessThan(0)) {
    throw new ValidationError("Machine model cost must be zero or greater");
  }

  const vendor = input.vendor?.trim() || null;
  if (vendor && vendor.length > 60) {
    throw new ValidationError("Vendor details must be 60 characters or fewer");
  }

  return { name, cost, vendor };
}

export interface MachineUnitInput {
  name: string;
}

export interface NormalizedMachineUnitInput {
  name: string;
}

/** docs/BUSINESS_RULES.md §11: unit name required <=50 chars. Uniqueness not enforced (matches reference). */
export function validateMachineUnitInput(input: MachineUnitInput): NormalizedMachineUnitInput {
  const name = input.name.trim();
  if (!name || name.length > 50) {
    throw new ValidationError("Machine unit name must be between 1 and 50 characters");
  }
  return { name };
}
