import type { LowStockAlertView } from "@/application/inventory/listLowStockAlerts";
import { CRITICALITY_LABEL, UNIT_LABEL, formatQuantity } from "@/lib/format";

export function LowStockAlerts({
  alerts,
  onSelect,
}: {
  alerts: LowStockAlertView[];
  onSelect: (sku: string) => void;
}) {
  return (
    <article className="side-card glass">
      <div className="side-top">
        <h2>Low stock alerts</h2>
        <span className="count-badge">
          {alerts.length} {alerts.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="alert-list">
        {alerts.length === 0 ? (
          <p className="subtle">Everything is comfortably stocked.</p>
        ) : (
          alerts.map((alert) => (
            <div className="alert-row" key={alert.id}>
              <div className="alert-info">
                <strong>{alert.name}</strong>
                <p className="subtle">
                  {alert.sku} · {alert.barcode}
                </p>
                <p className="alert-text">
                  {CRITICALITY_LABEL[alert.criticality]} ·{" "}
                  <span className={alert.status === "OUT_OF_STOCK" ? "alert-danger" : "alert-warning"}>
                    {alert.status === "OUT_OF_STOCK"
                      ? "Out of stock"
                      : `${formatQuantity(alert.stock)} ${UNIT_LABEL[alert.unitOfMeasure]} left`}
                  </span>{" "}
                  · threshold {formatQuantity(alert.threshold)}
                </p>
              </div>
              <button className="action-btn" type="button" onClick={() => onSelect(alert.sku)}>
                Use
              </button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
