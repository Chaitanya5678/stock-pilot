"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DepartmentView } from "@/application/catalog/listDepartments";
import type { MachineView } from "@/application/catalog/listMachines";
import type { MachineUnitView } from "@/application/catalog/listMachineUnits";
import type { DepartmentOption, MachineOption } from "@/application/catalog/listCatalogOptions";
import { DepartmentsPanel } from "@/components/machines/DepartmentsPanel";
import { MachinesPanel } from "@/components/machines/MachinesPanel";
import { MachineUnitsPanel } from "@/components/machines/MachineUnitsPanel";
import { DepartmentFormModal } from "@/components/machines/DepartmentFormModal";
import { MachineFormModal } from "@/components/machines/MachineFormModal";
import { MachineUnitFormModal } from "@/components/machines/MachineUnitFormModal";
import { deleteDepartmentAction } from "@/app/machines/actions";

export function MachinesWorkspace({
  departments,
  machines,
  units,
  canManage,
}: {
  departments: DepartmentView[];
  machines: MachineView[];
  units: MachineUnitView[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [departmentModal, setDepartmentModal] = useState<{ mode: "add" | "edit"; department: DepartmentView | null } | null>(
    null,
  );
  const [machineModal, setMachineModal] = useState<{ mode: "add" | "edit"; machine: MachineView | null } | null>(null);
  const [unitModal, setUnitModal] = useState<{ mode: "add" | "edit"; unit: MachineUnitView | null } | null>(null);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const departmentOptions: DepartmentOption[] = departments.map((d) => ({ id: d.id, name: d.name }));
  const machineOptions: MachineOption[] = machines.map((m) => ({ id: m.id, name: m.name, code: m.code, departmentId: m.departmentId }));

  function refresh() {
    router.refresh();
  }

  async function handleDeleteDepartment(department: DepartmentView) {
    if (!window.confirm(`Remove department "${department.name}"? This cannot be undone.`)) {
      return;
    }
    const result = await deleteDepartmentAction({ id: department.id });
    if (result.ok) {
      setBanner({ kind: "success", text: `Department "${department.name}" removed.` });
      refresh();
    } else {
      setBanner({ kind: "error", text: result.error });
    }
  }

  return (
    <>
      {banner ? (
        <p className={banner.kind === "success" ? "form-success" : "form-error"} role="status">
          {banner.text}
        </p>
      ) : null}
      <section className="machines-top-grid">
        <MachinesPanel
          machines={machines}
          canManage={canManage}
          onAdd={() => setMachineModal({ mode: "add", machine: null })}
          onEdit={(machine) => setMachineModal({ mode: "edit", machine })}
        />
        <DepartmentsPanel
          departments={departments}
          canManage={canManage}
          onAdd={() => setDepartmentModal({ mode: "add", department: null })}
          onEdit={(department) => setDepartmentModal({ mode: "edit", department })}
          onDelete={handleDeleteDepartment}
        />
      </section>
      <MachineUnitsPanel
        units={units}
        canManage={canManage}
        onAdd={() => setUnitModal({ mode: "add", unit: null })}
        onEdit={(unit) => setUnitModal({ mode: "edit", unit })}
      />

      {departmentModal ? (
        <DepartmentFormModal
          mode={departmentModal.mode}
          department={departmentModal.department}
          onClose={() => setDepartmentModal(null)}
          onSaved={refresh}
        />
      ) : null}
      {machineModal ? (
        <MachineFormModal
          mode={machineModal.mode}
          machine={machineModal.machine}
          departments={departmentOptions}
          onClose={() => setMachineModal(null)}
          onSaved={refresh}
        />
      ) : null}
      {unitModal ? (
        <MachineUnitFormModal
          mode={unitModal.mode}
          unit={unitModal.unit}
          machines={machineOptions}
          onClose={() => setUnitModal(null)}
          onSaved={refresh}
        />
      ) : null}
    </>
  );
}
