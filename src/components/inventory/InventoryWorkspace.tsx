"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MovementDirection } from "@/generated/prisma/enums";
import type { InventoryItemView } from "@/application/inventory/listInventoryItems";
import type { MovementView } from "@/application/inventory/listRecentMovements";
import { MovementPanel } from "@/components/inventory/MovementPanel";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { MovementHistory } from "@/components/inventory/MovementHistory";

export function InventoryWorkspace({
  items,
  movements,
  allowedDirections,
}: {
  items: InventoryItemView[];
  movements: MovementView[];
  allowedDirections: MovementDirection[];
}) {
  const router = useRouter();
  const [lookupValue, setLookupValue] = useState("");

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
        <InventoryTable items={items} onSelect={setLookupValue} />
        <aside className="sidebar">
          <MovementHistory movements={movements} />
        </aside>
      </section>
    </>
  );
}
