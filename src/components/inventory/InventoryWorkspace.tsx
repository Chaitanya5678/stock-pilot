"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementDirection } from "@/generated/prisma/enums";
import type { InventoryItemView } from "@/application/inventory/listInventoryItems";
import type { MovementView } from "@/application/inventory/listRecentMovements";
import type { DepartmentOption, MachineOption } from "@/application/catalog/listCatalogOptions";
import type { ShiftEntryView } from "@/application/shift/listShiftEntries";
import { MovementPanel } from "@/components/inventory/MovementPanel";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { MovementHistory } from "@/components/inventory/MovementHistory";
import { ShiftInchargeCard } from "@/components/inventory/ShiftInchargeCard";
import { ProductFormModal } from "@/components/catalog/ProductFormModal";

export function InventoryWorkspace({
  items,
  movements,
  allowedDirections,
  canManageCatalog,
  departments,
  machines,
  currentInchargeId,
  shiftEntries,
}: {
  items: InventoryItemView[];
  movements: MovementView[];
  allowedDirections: MovementDirection[];
  canManageCatalog: boolean;
  departments: DepartmentOption[];
  machines: MachineOption[];
  currentInchargeId: string | null;
  shiftEntries: ShiftEntryView[];
}) {
  const router = useRouter();
  const [lookupValue, setLookupValue] = useState("");
  const [productModal, setProductModal] = useState<{ mode: "add" | "edit"; item: InventoryItemView | null } | null>(
    null,
  );

  return (
    <>
      <MovementPanel
        items={items}
        allowedDirections={allowedDirections}
        lookupValue={lookupValue}
        onLookupChange={setLookupValue}
        onRecorded={() => router.refresh()}
      />
      <section className="workspace">
        <InventoryTable
          items={items}
          onSelect={setLookupValue}
          canManageCatalog={canManageCatalog}
          onAddProduct={() => setProductModal({ mode: "add", item: null })}
          onEditProduct={(item) => setProductModal({ mode: "edit", item })}
        />
        <aside className="sidebar">
          <MovementHistory movements={movements} />
          <ShiftInchargeCard
            currentInchargeId={currentInchargeId}
            entries={shiftEntries}
            canManage={canManageCatalog}
            onRecorded={() => router.refresh()}
          />
        </aside>
      </section>
      {productModal ? (
        <ProductFormModal
          mode={productModal.mode}
          item={productModal.item}
          departments={departments}
          machines={machines}
          onClose={() => setProductModal(null)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
