"use client";

import { useMemo, useState, type FormEvent } from "react";
import { MovementDirection } from "@/generated/prisma/enums";
import type { InventoryItemView } from "@/application/inventory/listInventoryItems";
import { recordMovementAction } from "@/app/inventory/actions";
import { DIRECTION_LABEL, UNIT_LABEL, formatQuantity } from "@/lib/format";

export function MovementPanel({
  items,
  allowedDirections,
  lookupValue,
  onLookupChange,
  onRecorded,
}: {
  items: InventoryItemView[];
  allowedDirections: MovementDirection[];
  lookupValue: string;
  onLookupChange: (value: string) => void;
  onRecorded: () => void;
}) {
  const [direction, setDirection] = useState<MovementDirection>(allowedDirections[0]);
  const [quantity, setQuantity] = useState("1");
  const [machineUnitId, setMachineUnitId] = useState("");
  const [reason, setReason] = useState("");
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const query = lookupValue.trim().toLowerCase();
  const matchedItem = useMemo(
    () =>
      query
        ? items.find((item) => item.sku.toLowerCase() === query || item.barcode === query) ?? null
        : null,
    [items, query],
  );

  const consumeWithMachine = direction === MovementDirection.CONSUME && Boolean(matchedItem?.machine);

  // Reset the machine-unit selection whenever the matched item or direction
  // changes, so a stale unit id from a previous item can't be submitted.
  // Adjusting state during render (rather than in a useEffect) is the
  // React-recommended pattern for "reset state when an input changes".
  const resetKey = `${matchedItem?.id ?? ""}:${direction}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setMachineUnitId("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matchedItem) {
      setMessage({ kind: "error", text: "Enter a valid barcode or product code first." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await recordMovementAction({
        itemId: matchedItem.id,
        direction,
        quantity,
        machineUnitId: consumeWithMachine ? machineUnitId || null : null,
        reason: direction === MovementDirection.ADJUSTMENT ? reason : null,
        employeeLabel: employeeLabel || null,
      });
      if (result.ok) {
        setMessage({
          kind: "success",
          text: `${formatQuantity(Number(quantity))} ${matchedItem.unitOfMeasure ? UNIT_LABEL[matchedItem.unitOfMeasure] : ""} recorded — new balance ${formatQuantity(result.balanceAfter)}.`,
        });
        setQuantity("1");
        setReason("");
        setEmployeeLabel("");
        onLookupChange("");
        onRecorded();
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const matchText = !lookupValue.trim()
    ? "Ready to scan or enter a product code."
    : matchedItem
      ? `Matched: ${matchedItem.name} · ${formatQuantity(matchedItem.stock)} ${UNIT_LABEL[matchedItem.unitOfMeasure]} available · ${matchedItem.sku}`
      : "No matching product code or barcode found.";

  return (
    <section className="movement-panel glass">
      <div className="movement-header">
        <div>
          <h2>Stock movement</h2>
          <span className="subtle">Enter a product code or barcode to add, consume, or adjust stock.</span>
        </div>
      </div>
      <form className="movement-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="productLookup">Barcode or product code</label>
          <input
            id="productLookup"
            autoComplete="off"
            placeholder="e.g. MNT-CMP-OSP-V-1000 or 8901001001000"
            value={lookupValue}
            onChange={(event) => onLookupChange(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="movementQuantity">
            Quantity {matchedItem ? `(${UNIT_LABEL[matchedItem.unitOfMeasure]})` : ""}
          </label>
          <input
            id="movementQuantity"
            type="number"
            min={direction === MovementDirection.ADJUSTMENT ? undefined : 0.01}
            step="0.01"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="movementType">Movement</label>
          <select
            id="movementType"
            value={direction}
            onChange={(event) => setDirection(event.target.value as MovementDirection)}
          >
            {allowedDirections.map((value) => (
              <option key={value} value={value}>
                {DIRECTION_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        {consumeWithMachine ? (
          <div className="field">
            <label htmlFor="movementMachineUnit">Machine unit</label>
            <select
              id="movementMachineUnit"
              required
              value={machineUnitId}
              onChange={(event) => setMachineUnitId(event.target.value)}
            >
              <option value="">Select machine unit</option>
              {matchedItem?.machineUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="movementMachineModel">Machine model</label>
            <input
              id="movementMachineModel"
              readOnly
              value={matchedItem ? matchedItem.machine?.name ?? "Store inventory — no machine" : "Scan a product first"}
            />
          </div>
        )}
        {direction === MovementDirection.ADJUSTMENT ? (
          <div className="field full">
            <label htmlFor="movementReason">Reason for adjustment</label>
            <input
              id="movementReason"
              required
              placeholder="e.g. Cycle count correction"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="employeeLabel">Employee ID (optional, display only)</label>
          <input
            id="employeeLabel"
            maxLength={20}
            placeholder="e.g. EMP-104"
            value={employeeLabel}
            onChange={(event) => setEmployeeLabel(event.target.value)}
          />
        </div>
        <button className="primary-btn" type="submit" disabled={submitting || !matchedItem}>
          {submitting ? "Recording…" : "Record movement"}
        </button>
      </form>
      <p className={`product-match ${matchedItem ? "found" : lookupValue.trim() ? "error" : ""}`}>{matchText}</p>
      {message ? (
        <p className={message.kind === "success" ? "form-success" : "form-error"} role="status">
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
