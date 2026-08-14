import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";

export interface MachineView {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  cost: number;
  vendor: string | null;
  warrantyUntil: string | null;
  unitCount: number;
}

export async function listMachines(role: Role): Promise<MachineView[]> {
  requirePermission(role, "catalog:view");

  const machines = await prisma.machine.findMany({
    include: { department: true, _count: { select: { units: true } } },
    orderBy: { name: "asc" },
  });

  return machines.map((machine) => ({
    id: machine.id,
    name: machine.name,
    code: machine.code,
    departmentId: machine.departmentId,
    departmentName: machine.department.name,
    cost: machine.cost.toNumber(),
    vendor: machine.vendor,
    warrantyUntil: machine.warrantyUntil ? machine.warrantyUntil.toISOString() : null,
    unitCount: machine._count.units,
  }));
}
