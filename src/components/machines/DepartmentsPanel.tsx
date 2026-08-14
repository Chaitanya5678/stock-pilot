"use client";

import { useMemo, useState } from "react";
import type { DepartmentView } from "@/application/catalog/listDepartments";

export function DepartmentsPanel({
  departments,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: {
  departments: DepartmentView[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (department: DepartmentView) => void;
  onDelete: (department: DepartmentView) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((department) =>
      `${department.name} ${department.code}`.toLowerCase().includes(query),
    );
  }, [departments, search]);

  return (
    <article className="master-panel glass">
      <div className="panel-header">
        <div>
          <h2>Departments</h2>
          <span className="subtle">{departments.length} {departments.length === 1 ? "dept" : "depts"}</span>
        </div>
        {canManage ? (
          <button className="primary-btn" type="button" onClick={onAdd}>
            Add department
          </button>
        ) : null}
      </div>
      <div className="filters">
        <div className="search">
          <input
            type="search"
            placeholder="Search departments…"
            aria-label="Search departments"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="master-list">
        {filtered.length === 0 ? (
          <p className="empty">No departments match your search.</p>
        ) : (
          filtered.map((department) => (
            <div className="master-row" key={department.id}>
              <div>
                <strong>{department.name}</strong>
                <p>
                  {department.machineCount} {department.machineCount === 1 ? "machine" : "machines"} ·{" "}
                  {department.itemCount} {department.itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="row-actions">
                <span className="code-badge">{department.code}</span>
                {canManage ? (
                  <>
                    <button className="action-btn" type="button" onClick={() => onEdit(department)}>
                      Edit
                    </button>
                    <button className="action-btn" type="button" onClick={() => onDelete(department)}>
                      Remove
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
