"use client";

import { useState, type FormEvent } from "react";
import type { ShiftEntryView } from "@/application/shift/listShiftEntries";
import { recordShiftEntryAction } from "@/app/inventory/shiftActions";
import { formatDateTime } from "@/lib/format";

function defaultEffectiveAt(): string {
  return new Date().toISOString().slice(0, 16);
}

export function ShiftInchargeCard({
  currentInchargeId,
  entries,
  canManage,
  onRecorded,
}: {
  currentInchargeId: string | null;
  entries: ShiftEntryView[];
  canManage: boolean;
  onRecorded: () => void;
}) {
  const [inchargeId, setInchargeId] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(defaultEffectiveAt);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await recordShiftEntryAction({
        inchargeId,
        effectiveAt: new Date(effectiveAt).toISOString(),
      });
      if (result.ok) {
        setMessage({ kind: "success", text: `${inchargeId} recorded as shift in-charge.` });
        setInchargeId("");
        setEffectiveAt(defaultEffectiveAt());
        onRecorded();
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="side-card glass">
      <div className="side-top">
        <h2>Shift in-charge log</h2>
        <span className="subtle">Current: {currentInchargeId ?? "No in-charge logged"}</span>
      </div>
      {canManage ? (
        <form className="shift-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="shiftIncharge">In-charge ID</label>
            <input
              id="shiftIncharge"
              maxLength={20}
              required
              placeholder="e.g. INC-204"
              value={inchargeId}
              onChange={(event) => setInchargeId(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="shiftTimestamp">Effective timestamp</label>
            <input
              id="shiftTimestamp"
              type="datetime-local"
              required
              value={effectiveAt}
              onChange={(event) => setEffectiveAt(event.target.value)}
            />
          </div>
          {message ? (
            <p className={message.kind === "success" ? "form-success" : "form-error"} role="status">
              {message.text}
            </p>
          ) : null}
          <button className="primary-btn full" type="submit" disabled={submitting}>
            {submitting ? "Recording…" : "Record in-charge"}
          </button>
        </form>
      ) : null}
      <div className="shift-list">
        {entries.length === 0 ? (
          <p className="subtle">No shift in-charge logged.</p>
        ) : (
          entries.map((entry) => (
            <div className="shift-row" key={entry.id}>
              <strong>{entry.inchargeId}</strong>
              <span>{formatDateTime(entry.effectiveAt)}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
