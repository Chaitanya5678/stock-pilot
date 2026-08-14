"use client";

import { useMemo, useState } from "react";
import type { MachineView } from "@/application/catalog/listMachines";

export function MachinesPanel({
  machines,
  canManage,
  onAdd,
  onEdit,
}: {
  machines: MachineView[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (machine: MachineView) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return machines;
    return machines.filter((machine) =>
      `${machine.name} ${machine.code} ${machine.departmentName} ${machine.vendor ?? ""}`.toLowerCase().includes(query),
    );
  }, [machines, search]);

  return (
    <article className="master-panel glass">
      <div className="panel-header">
        <div>
          <h2>Machine models</h2>
          <span className="subtle">{machines.length} {machines.length === 1 ? "model" : "models"}</span>
        </div>
        {canManage ? (
          <button className="primary-btn" type="button" onClick={onAdd}>
            Add machine model
          </button>
        ) : null}
      </div>
      <div className="filters">
        <div className="search">
          <input
            type="search"
            placeholder="Search machine models…"
            aria-label="Search machine models"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="master-list">
        {filtered.length === 0 ? (
          <p className="empty">No machine models match your search.</p>
        ) : (
          filtered.map((machine) => (
            <div className="master-row" key={machine.id}>
              <div>
                <strong>{machine.name}</strong>
                <p>
                  {machine.departmentName} · {machine.vendor ?? "Vendor not set"} · {machine.unitCount}{" "}
                  {machine.unitCount === 1 ? "unit" : "units"}
                </p>
              </div>
              <div className="row-actions">
                <span className="code-badge">{machine.code}</span>
                {canManage ? (
                  <button className="action-btn" type="button" onClick={() => onEdit(machine)}>
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
