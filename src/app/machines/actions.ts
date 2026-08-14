"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";
import type { SessionPayload } from "@/infrastructure/auth/session";
import { createDepartment } from "@/application/catalog/createDepartment";
import { updateDepartment } from "@/application/catalog/updateDepartment";
import { deleteDepartment } from "@/application/catalog/deleteDepartment";
import { createMachine } from "@/application/catalog/createMachine";
import { updateMachine } from "@/application/catalog/updateMachine";
import { createMachineUnit } from "@/application/catalog/createMachineUnit";
import { updateMachineUnit } from "@/application/catalog/updateMachineUnit";
import { mapDomainError } from "@/lib/mapDomainError";

export type DepartmentActionResult = { ok: true; id: string } | { ok: false; error: string };
export type MachineActionResult = { ok: true; id: string } | { ok: false; error: string };
export type MachineUnitActionResult = { ok: true; id: string } | { ok: false; error: string };
export type DeleteActionResult = { ok: true } | { ok: false; error: string };

const departmentSchema = z.object({ name: z.string().min(1) });
const updateDepartmentSchema = departmentSchema.extend({ id: z.string().min(1) });

const machineSchema = z.object({
  name: z.string().min(1),
  departmentId: z.string().min(1),
  cost: z.coerce.number(),
  vendor: z.string().optional().nullable(),
  warrantyUntil: z.string().optional().nullable(),
});
const updateMachineSchema = machineSchema.extend({ id: z.string().min(1) });

const machineUnitSchema = z.object({ machineId: z.string().min(1), name: z.string().min(1) });
const updateMachineUnitSchema = machineUnitSchema.extend({ id: z.string().min(1) });

function invalidInput<T extends { ok: false; error: string }>(): T {
  return { ok: false, error: "Please check the details and try again." } as T;
}

const NOT_LOGGED_IN = { ok: false, error: "You must be logged in." } as const;

// --- Department --------------------------------------------------------

export async function performCreateDepartment(session: SessionPayload, rawInput: unknown): Promise<DepartmentActionResult> {
  const parsed = departmentSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    const department = await createDepartment({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: department.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function performUpdateDepartment(session: SessionPayload, rawInput: unknown): Promise<DepartmentActionResult> {
  const parsed = updateDepartmentSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    const department = await updateDepartment({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: department.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function performDeleteDepartment(session: SessionPayload, rawInput: unknown): Promise<DeleteActionResult> {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    await deleteDepartment({ id: parsed.data.id, performedByRole: session.role });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function createDepartmentAction(rawInput: unknown): Promise<DepartmentActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performCreateDepartment(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}

export async function updateDepartmentAction(rawInput: unknown): Promise<DepartmentActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performUpdateDepartment(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}

export async function deleteDepartmentAction(rawInput: unknown): Promise<DeleteActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performDeleteDepartment(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}

// --- Machine -------------------------------------------------------------

export async function performCreateMachine(session: SessionPayload, rawInput: unknown): Promise<MachineActionResult> {
  const parsed = machineSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    const machine = await createMachine({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: machine.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function performUpdateMachine(session: SessionPayload, rawInput: unknown): Promise<MachineActionResult> {
  const parsed = updateMachineSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    const machine = await updateMachine({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: machine.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function createMachineAction(rawInput: unknown): Promise<MachineActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performCreateMachine(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}

export async function updateMachineAction(rawInput: unknown): Promise<MachineActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performUpdateMachine(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}

// --- Machine unit ----------------------------------------------------------

export async function performCreateMachineUnit(
  session: SessionPayload,
  rawInput: unknown,
): Promise<MachineUnitActionResult> {
  const parsed = machineUnitSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    const unit = await createMachineUnit({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: unit.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function performUpdateMachineUnit(
  session: SessionPayload,
  rawInput: unknown,
): Promise<MachineUnitActionResult> {
  const parsed = updateMachineUnitSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  try {
    const unit = await updateMachineUnit({ ...parsed.data, performedByRole: session.role });
    return { ok: true, id: unit.id };
  } catch (error) {
    return { ok: false, error: mapDomainError(error) };
  }
}

export async function createMachineUnitAction(rawInput: unknown): Promise<MachineUnitActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performCreateMachineUnit(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}

export async function updateMachineUnitAction(rawInput: unknown): Promise<MachineUnitActionResult> {
  const session = await getCurrentSession();
  if (!session) return NOT_LOGGED_IN;
  const result = await performUpdateMachineUnit(session, rawInput);
  if (result.ok) revalidatePath("/machines");
  return result;
}
