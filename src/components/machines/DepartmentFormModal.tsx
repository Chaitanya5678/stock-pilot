"use client";

import { useState, type FormEvent } from "react";
import type { DepartmentView } from "@/application/catalog/listDepartments";
import { createDepartmentAction, updateDepartmentAction } from "@/app/machines/actions";

export function DepartmentFormModal({
  mode,
  department,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  department: DepartmentView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(department?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "add" ? await createDepartmentAction({ name }) : await updateDepartmentAction({ id: department!.id, name });
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
      <section className="modal glass" role="dialog" aria-modal="true" aria-labelledby="deptModalTitle">
        <div className="modal-heading">
          <div>
            <h2 id="deptModalTitle">{mode === "add" ? "Add department" : "Edit department"}</h2>
            <p className="subtle">
              {mode === "add"
                ? "ID and code are strictly auto-generated."
                : `Code ${department?.code} is fixed and does not change when renaming.`}
            </p>
          </div>
          <button className="text-btn" type="button" onClick={onClose} aria-label="Close dialog">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="deptName">Department name</label>
              <input
                id="deptName"
                required
                maxLength={40}
                placeholder="e.g. Quality Assurance"
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
              {submitting ? "Saving…" : mode === "add" ? "Add department" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
