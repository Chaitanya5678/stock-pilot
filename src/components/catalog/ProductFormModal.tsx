"use client";

import { useState, type FormEvent } from "react";
import { ItemCategory, Criticality, UnitOfMeasure } from "@/generated/prisma/enums";
import type { InventoryItemView } from "@/application/inventory/listInventoryItems";
import type { DepartmentOption, MachineOption } from "@/application/catalog/listCatalogOptions";
import { createProductAction, updateProductAction } from "@/app/inventory/catalogActions";
import { CATEGORY_LABEL, CRITICALITY_LABEL, UNIT_LABEL } from "@/lib/format";

const CATEGORY_OPTIONS = Object.values(ItemCategory);
const CRITICALITY_OPTIONS = Object.values(Criticality);
const UNIT_OPTIONS = Object.values(UnitOfMeasure);

export function ProductFormModal({
  mode,
  item,
  departments,
  machines,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  item: InventoryItemView | null;
  departments: DepartmentOption[];
  machines: MachineOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialMachine = item?.machine ? machines.find((machine) => machine.id === item.machine!.id) : null;
  const [name, setName] = useState(item?.name ?? "");
  const [departmentId, setDepartmentId] = useState(
    initialMachine?.departmentId ?? departments.find((d) => d.name === item?.department)?.id ?? departments[0]?.id ?? "",
  );
  const [machineId, setMachineId] = useState(item?.machine?.id ?? "");
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? ItemCategory.CAPITAL_SPARES);
  const [criticality, setCriticality] = useState<Criticality>(item?.criticality ?? Criticality.ESSENTIAL);
  const [rack, setRack] = useState(item?.rack ?? "");
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>(item?.unitOfMeasure ?? UnitOfMeasure.EACH);
  const [stock, setStock] = useState("10");
  const [threshold, setThreshold] = useState(item ? String(item.threshold) : "10");
  const [price, setPrice] = useState("19.99");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleMachineChange(value: string) {
    setMachineId(value);
    const machine = machines.find((candidate) => candidate.id === value);
    if (machine) {
      setDepartmentId(machine.departmentId);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const shared = {
        name,
        departmentId,
        machineId: machineId || null,
        category,
        criticality,
        rack,
        unitOfMeasure,
        threshold,
        price,
      };
      const result =
        mode === "add"
          ? await createProductAction({ ...shared, stock })
          : await updateProductAction({ ...shared, id: item!.id });

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
      <section className="modal glass" role="dialog" aria-modal="true" aria-labelledby="productModalTitle">
        <div className="modal-heading">
          <div>
            <h2 id="productModalTitle">{mode === "add" ? "Add inventory item" : "Edit inventory item"}</h2>
            <p className="subtle">
              {mode === "add"
                ? "A product code and barcode are generated automatically."
                : "Stock is managed separately — use Stock movement to change quantity."}
            </p>
          </div>
          <button className="text-btn" type="button" onClick={onClose} aria-label="Close dialog">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="itemName">Product name</label>
              <input id="itemName" required maxLength={45} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="itemDepartment">Department</label>
              <select id="itemDepartment" required value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="itemMachine">Machine model</label>
              <select id="itemMachine" value={machineId} onChange={(event) => handleMachineChange(event.target.value)}>
                <option value="">Not linked to a machine (store inventory)</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} ({machine.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="itemCategory">Category</label>
              <select
                id="itemCategory"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value as ItemCategory)}
              >
                {CATEGORY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="itemType">Criticality</label>
              <select
                id="itemType"
                required
                value={criticality}
                onChange={(event) => setCriticality(event.target.value as Criticality)}
              >
                {CRITICALITY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {CRITICALITY_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="itemRack">Rack location</label>
              <input id="itemRack" required maxLength={30} value={rack} onChange={(event) => setRack(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="itemUnit">Unit of material</label>
              <select
                id="itemUnit"
                value={unitOfMeasure}
                onChange={(event) => setUnitOfMeasure(event.target.value as UnitOfMeasure)}
              >
                {UNIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {UNIT_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            {mode === "add" ? (
              <div className="field">
                <label htmlFor="itemStock">Opening quantity</label>
                <input
                  id="itemStock"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="itemThreshold">Low-stock threshold</label>
              <input
                id="itemThreshold"
                type="number"
                min={0}
                step="0.01"
                required
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="itemPrice">Unit price (₹)</label>
              <input
                id="itemPrice"
                type="number"
                min={0}
                step="0.01"
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
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
              {submitting ? "Saving…" : mode === "add" ? "Add item" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
