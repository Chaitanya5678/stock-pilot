import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";

export interface MachineUnitView {
  id: string;
  name: string;
  machineId: string;
  machineName: string;
}

export async function listMachineUnits(role: Role): Promise<MachineUnitView[]> {
  requirePermission(role, "catalog:view");

  const units = await prisma.machineUnit.findMany({
    include: { machine: true },
    orderBy: { name: "asc" },
  });

  return units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    machineId: unit.machineId,
    machineName: unit.machine.name,
  }));
}
