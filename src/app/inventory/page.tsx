import { requireSession } from "@/infrastructure/auth/requireSession";
import { listInventoryItems } from "@/application/inventory/listInventoryItems";
import { listRecentMovements } from "@/application/inventory/listRecentMovements";
import { listCatalogOptions } from "@/application/catalog/listCatalogOptions";
import { listShiftEntries } from "@/application/shift/listShiftEntries";
import { getCurrentShiftIncharge } from "@/application/shift/getCurrentShiftIncharge";
import { allowedMovementDirections } from "@/domain/stock/movementPermissions";
import { hasPermission } from "@/domain/rbac/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { InventoryWorkspace } from "@/components/inventory/InventoryWorkspace";

export default async function InventoryPage() {
  const session = await requireSession();

  const [items, movements, catalogOptions, shiftEntries, currentShift] = await Promise.all([
    listInventoryItems(session.role),
    listRecentMovements(session.role),
    listCatalogOptions(session.role),
    listShiftEntries(session.role),
    getCurrentShiftIncharge(session.role),
  ]);

  return (
    <main className="app">
      <AppHeader displayName={session.displayName} role={session.role} />
      <section className="hero">
        <div>
          <p className="eyebrow">MRO inventory overview</p>
          <h1>Your store, at a glance.</h1>
        </div>
      </section>
      <InventoryWorkspace
        items={items}
        movements={movements}
        allowedDirections={allowedMovementDirections(session.role)}
        canManageCatalog={hasPermission(session.role, "catalog:manage")}
        departments={catalogOptions.departments}
        machines={catalogOptions.machines}
        currentInchargeId={currentShift.inchargeId}
        shiftEntries={shiftEntries}
      />
    </main>
  );
}
