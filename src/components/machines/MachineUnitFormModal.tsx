"use client";

import { useState, type FormEvent } from "react";
import type { MachineUnitView } from "@/application/catalog/listMachineUnits";
import type { MachineOption } from "@/application/catalog/listCatalogOptions";
import { createMachineUnitAction, updateMachineUnitAction } from "@/app/machines/actions";

export function MachineUnitFormModal({
  mode,
  unit,
  machines,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  unit: MachineUnitView | null;
  machines: MachineOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [machineId, setMachineId] = useState(unit?.machineId ?? machines[0]?.id ?? "");
  const [name, setName] = useState(unit?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "add"
          ? await createMachineUnitAction({ machineId, name })
          : await updateMachineUnitAction({ id: unit!.id, machineId, name });
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
      <section className="modal glass" role="dialog" aria-modal="true" aria-labelledby="unitModalTitle">
        <div className="modal-heading">
          <div>
            <h2 id="unitModalTitle">{mode === "add" ? "Add machine unit" : "Edit machine unit"}</h2>
            <p className="subtle">Unit ID is strictly auto-generated.</p>
          </div>
          <button className="text-btn" type="button" onClick={onClose} aria-label="Close dialog">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="unitMachine">Machine model</label>
              <select id="unitMachine" required value={machineId} onChange={(event) => setMachineId(event.target.value)}>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} ({machine.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="unitName">Unit name / number</label>
              <input
                id="unitName"
                required
                maxLength={50}
                placeholder="e.g. Boiler 02"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
              {submitting ? "Saving…" : mode === "add" ? "Add unit" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
