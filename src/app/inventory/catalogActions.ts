"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";
import type { SessionPayload } from "@/infrastructure/auth/session";
import { createInventoryItem } from "@/application/catalog/createInventoryItem";
import { updateInventoryItem } from "@/application/catalog/updateInventoryItem";
import { mapDomainError } from "@/lib/mapDomainError";

export type ProductActionResult = { ok: true; itemId: string } | { ok: false; error: string };

const categoryValues = Object.values(ItemCategory) as [ItemCategory, ...ItemCategory[]];
const criticalityValues = Object.values(Criticality) as [Criticality, ...Criticality[]];
const unitValues = Object.values(UnitOfMeasure) as [UnitOfMeasure, ...UnitOfMeasure[]];

const createProductSchema = z.object({
  name: z.string().min(1),
  departmentId: z.string().min(1),
  machineId: z.string().min(1).optional().nullable(),
  category: z.enum(categoryValues),
  criticality: z.enum(criticalityValues),
  rack: z.string().min(1),
  unitOfMeasure: z.enum(unitValues),
  stock: z.coerce.number(),
  threshold: z.coerce.number(),
  price: z.coerce.number(),
});

const updateProductSchema = createProductSchema.omit({ stock: true }).extend({
  id: z.string().min(1),
});

/** Callable directly from tests with an explicit session — see actions.ts for why. */
export async function performCreateProduct(
  session: SessionPayload,
  rawInput: unknown,
): Promise<ProductActionResult> {
  const parsed = createProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please check the product details and try again." };
  }

  try {
    const item = await createInventoryItem({
      ...parsed.data,
      machineId: parsed.data.machineId ?? null,
      performedByRole: session.role,
    });
    return { ok: true, itemId: item.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function performUpdateProduct(
  session: SessionPayload,
  rawInput: unknown,
): Promise<ProductActionResult> {
  const parsed = updateProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Please check the product details and try again." };
  }

  try {
    const item = await updateInventoryItem({
      ...parsed.data,
      machineId: parsed.data.machineId ?? null,
      performedByRole: session.role,
    });
    return { ok: true, itemId: item.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function createProductAction(rawInput: unknown): Promise<ProductActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: "You must be logged in to add a product." };
  }
  const result = await performCreateProduct(session, rawInput);
  if (result.ok) {
    revalidatePath("/inventory");
  }
  return result;
}

export async function updateProductAction(rawInput: unknown): Promise<ProductActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: "You must be logged in to edit a product." };
  }
  const result = await performUpdateProduct(session, rawInput);
  if (result.ok) {
    revalidatePath("/inventory");
  }
  return result;
}
