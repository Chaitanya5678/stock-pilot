"use client";

import { useState, type FormEvent } from "react";
import type { MachineView } from "@/application/catalog/listMachines";
import type { DepartmentOption } from "@/application/catalog/listCatalogOptions";
import { createMachineAction, updateMachineAction } from "@/app/machines/actions";

export function MachineFormModal({
  mode,
  machine,
  departments,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  machine: MachineView | null;
  departments: DepartmentOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(machine?.name ?? "");
  const [departmentId, setDepartmentId] = useState(machine?.departmentId ?? departments[0]?.id ?? "");
  const [cost, setCost] = useState(machine ? String(machine.cost) : "0");
  const [vendor, setVendor] = useState(machine?.vendor ?? "");
  const [warrantyUntil, setWarrantyUntil] = useState(machine?.warrantyUntil ? machine.warrantyUntil.slice(0, 10) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const shared = { name, departmentId, cost, vendor: vendor || null, warrantyUntil: warrantyUntil || null };
      const result =
        mode === "add" ? await createMachineAction(shared) : await updateMachineAction({ ...shared, id: machine!.id });
      if (result.ok) {
        onSaved();
        onClose();
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop open" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal glass" role="dialog" aria-modal="true" aria-labelledby="machineModalTitle">
        <div className="modal-heading">
          <div>
            <h2 id="machineModalTitle">{mode === "add" ? "Add machine model" : "Edit machine model"}</h2>
            <p className="subtle">
              {mode === "add" ? "Model code is strictly auto-generated." : `Code ${machine?.code} is fixed and does not change.`}
            </p>
          </div>
          <button className="text-btn" type="button" onClick={onClose} aria-label="Close dialog">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="machineName">Machine model name</label>
              <input
                id="machineName"
                required
                maxLength={60}
                placeholder="e.g. Boiler, High Pressure"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="machineDepartment">Department</label>
              <select id="machineDepartment" required value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="machineCost">Model cost (₹)</label>
              <input
                id="machineCost"
                type="number"
                min={0}
                step="0.01"
                required
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="machineVendor">Vendor details</label>
              <input
                id="machineVendor"
                maxLength={60}
                placeholder="Vendor / contact"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="machineWarranty">Warranty until</label>
              <input
                id="machineWarranty"
                type="date"
                value={warrantyUntil}
                onChange={(event) => setWarrantyUntil(event.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="modal-actions">
            <button className="text-btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : mode === "add" ? "Add model" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
