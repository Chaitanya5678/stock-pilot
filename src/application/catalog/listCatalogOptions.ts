import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { requirePermission } from "@/domain/rbac/permissions";

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface MachineOption {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

/**
 * Read-only lookup data for the product form's department/machine selects.
 * Not department/machine CRUD (out of scope for this feature) — just the
 * minimum read needed to populate the Add/Edit Product form, same as
 * listInventoryItems already reads machine/department context for the list.
 */
export async function listCatalogOptions(
  role: Role,
): Promise<{ departments: DepartmentOption[]; machines: MachineOption[] }> {
  requirePermission(role, "catalog:view");

  const [departments, machines] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.machine.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    departments: departments.map((department) => ({ id: department.id, name: department.name })),
    machines: machines.map((machine) => ({
      id: machine.id,
      name: machine.name,
      code: machine.code,
      departmentId: machine.departmentId,
    })),
  };
}
