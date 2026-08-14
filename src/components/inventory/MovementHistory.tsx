import type { MovementView } from "@/application/inventory/listRecentMovements";
import { DIRECTION_LABEL, formatDateTime, formatQuantity } from "@/lib/format";

export function MovementHistory({ movements }: { movements: MovementView[] }) {
  return (
    <article className="side-card glass">
      <div className="side-top">
        <h2>Stock history</h2>
        <span className="subtle">{movements.length} recent</span>
      </div>
      <div className="movement-list">
        {movements.length === 0 ? (
          <p className="subtle">No stock movements recorded yet.</p>
        ) : (
          movements.map((movement) => (
            <div className="movement-row" key={movement.id}>
              <div className="movement-row-top">
                <strong>{movement.itemName}</strong>
                <span className={`movement-qty ${movement.direction === "CONSUME" ? "consume" : "add"}`}>
                  {movement.direction === "CONSUME" ? "−" : "+"}
                  {formatQuantity(Math.abs(movement.quantity))}
                </span>
              </div>
              <p className="subtle">
                {DIRECTION_LABEL[movement.direction]} · balance {formatQuantity(movement.balanceAfter)} ·{" "}
                {movement.performedByName}
                {movement.machineUnitName ? ` · ${movement.machineUnitName}` : ""}
              </p>
              {movement.reason ? <p className="subtle">Reason: {movement.reason}</p> : null}
              <p className="subtle">{formatDateTime(movement.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
