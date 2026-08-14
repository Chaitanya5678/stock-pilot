import { requireSession } from "@/infrastructure/auth/requireSession";
import { listDepartments } from "@/application/catalog/listDepartments";
import { listMachines } from "@/application/catalog/listMachines";
import { listMachineUnits } from "@/application/catalog/listMachineUnits";
import { hasPermission } from "@/domain/rbac/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { MachinesWorkspace } from "@/components/machines/MachinesWorkspace";

export default async function MachinesPage() {
  const session = await requireSession();

  const [departments, machines, units] = await Promise.all([
    listDepartments(session.role),
    listMachines(session.role),
    listMachineUnits(session.role),
  ]);

  return (
    <main className="app">
      <AppHeader displayName={session.displayName} role={session.role} />
      <section className="hero">
        <div>
          <p className="eyebrow">Equipment &amp; department register</p>
          <h1>Machines &amp; departments.</h1>
        </div>
      </section>
      <MachinesWorkspace
        departments={departments}
        machines={machines}
        units={units}
        canManage={hasPermission(session.role, "catalog:manage")}
      />
    </main>
  );
}
