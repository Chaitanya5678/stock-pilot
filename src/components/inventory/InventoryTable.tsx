"use client";

import { useMemo, useState } from "react";
import type { InventoryItemView } from "@/application/inventory/listInventoryItems";
import { CATEGORY_LABEL, CRITICALITY_LABEL, STATUS_LABEL, formatQuantity, UNIT_LABEL } from "@/lib/format";

export function InventoryTable({
  items,
  onSelect,
}: {
  items: InventoryItemView[];
  onSelect: (sku: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const departments = useMemo(() => [...new Set(items.map((item) => item.department))].sort(), [items]);
  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort(), [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !query ||
        `${item.name} ${item.sku} ${item.barcode} ${item.department} ${item.rack} ${item.machine?.name ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesDepartment = department === "all" || item.department === department;
      const matchesCategory = category === "all" || item.category === category;
      const matchesStatus = status === "all" || item.status === status;
      return matchesQuery && matchesDepartment && matchesCategory && matchesStatus;
    });
  }, [items, search, department, category, status]);

  return (
    <article className="inventory glass">
      <div className="panel-header">
        <div>
          <h2>Product inventory</h2>
          <span className="subtle">{filtered.length} of {items.length} items shown</span>
        </div>
      </div>
      <div className="filters">
        <div className="search">
          <input
            type="search"
            placeholder="Search items…"
            aria-label="Search inventory"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select aria-label="Filter by department" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="all">All departments</option>
          {departments.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABEL[value]}
            </option>
          ))}
        </select>
        <select aria-label="Filter by stock status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="IN_STOCK">In stock</option>
          <option value="LOW_STOCK">Low stock</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Machine model / Rack</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="item-cell">
                    <span>
                      {item.name}
                      <small className="sku">
                        {item.sku} · {item.barcode}
                      </small>
                    </span>
                  </div>
                </td>
                <td>
                  {item.machine?.name ?? "Store inventory"}
                  <small className="sku">
                    Rack {item.rack} · {item.department}
                  </small>
                </td>
                <td>
                  {CATEGORY_LABEL[item.category]}
                  <small className="sku">{CRITICALITY_LABEL[item.criticality]}</small>
                </td>
                <td>
                  <span className="stock-number">{formatQuantity(item.stock)}</span> {UNIT_LABEL[item.unitOfMeasure]}
                </td>
                <td>
                  <span className={`status ${item.status.toLowerCase()}`}>{STATUS_LABEL[item.status]}</span>
                </td>
                <td>
                  <button className="action-btn" type="button" onClick={() => onSelect(item.sku)}>
                    Use
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="empty">No items match your search.</p> : null}
      </div>
    </article>
  );
}
