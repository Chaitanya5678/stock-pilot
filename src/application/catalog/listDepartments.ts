import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";

export interface DepartmentView {
  id: string;
  name: string;
  code: string;
  machineCount: number;
  itemCount: number;
}

export async function listDepartments(role: Role): Promise<DepartmentView[]> {
  requirePermission(role, "catalog:view");

  const departments = await prisma.department.findMany({
    include: { _count: { select: { machines: true, items: true } } },
    orderBy: { name: "asc" },
  });

  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    machineCount: department._count.machines,
    itemCount: department._count.items,
  }));
}
