"use client";

import { useMemo, useState } from "react";
import type { MachineUnitView } from "@/application/catalog/listMachineUnits";

export function MachineUnitsPanel({
  units,
  canManage,
  onAdd,
  onEdit,
}: {
  units: MachineUnitView[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (unit: MachineUnitView) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return units;
    return units.filter((unit) => `${unit.name} ${unit.machineName}`.toLowerCase().includes(query));
  }, [units, search]);

  return (
    <article className="master-panel glass">
      <div className="panel-header">
        <div>
          <h2>Machine units</h2>
          <span className="subtle">{units.length} {units.length === 1 ? "unit" : "units"}</span>
        </div>
        {canManage ? (
          <button className="primary-btn" type="button" onClick={onAdd}>
            Add machine unit
          </button>
        ) : null}
      </div>
      <div className="filters">
        <div className="search">
          <input
            type="search"
            placeholder="Search machine units…"
            aria-label="Search machine units"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="master-list">
        {filtered.length === 0 ? (
          <p className="empty">No machine units match your search.</p>
        ) : (
          filtered.map((unit) => (
            <div className="master-row" key={unit.id}>
              <div>
                <strong>{unit.name}</strong>
                <p>Model: {unit.machineName}</p>
              </div>
              <div className="row-actions">
                {canManage ? (
                  <button className="action-btn" type="button" onClick={() => onEdit(unit)}>
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
