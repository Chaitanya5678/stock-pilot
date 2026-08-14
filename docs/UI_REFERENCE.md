# UI_REFERENCE.md — Screen & Component Inventory

Structural/behavioural inventory of the reference UI. Visual styling (glassmorphism, colors,
blur) is explicitly lowest priority per CLAUDE.md ("Reference UI fidelity" ranks below
correctness and architecture) — this doc favors structure and terminology over CSS detail.

## 1. Global shell

- **Top bar**: brand mark + "Stockly" wordmark, primary nav (Inventory / Machines / Analytics —
  tab-style, one active at a time, toggles `hidden` on three `.page` sections), a cosmetic "All
  changes saved" sync indicator (`REFERENCE_BEHAVIOUR`: always shows this static string, there is
  no real save state to reflect), and a static avatar ("AP" initials, no menu, no identity).
- **Toast**: single bottom-center transient notification (`#toast`), auto-dismiss ~2.8s, reused
  for every success/error message app-wide. Not stackable — a new toast replaces the current one.
- **Modals**: 4 total (Add/Edit/Duplicate Item, Add Department, Add Machine Model, Add Machine
  Unit). Shared open/close mechanics: backdrop click, Escape key, explicit close/cancel buttons.
  No confirmation-on-close-with-unsaved-changes.

`REFERENCE_BEHAVIOUR` note: several non-ASCII characters (icons, en-dashes, the × close glyph) in
the source file render as mojibake (e.g. `â`, `Â·`) — this is a character-encoding artifact of the
reference file, not an intended visual design. Do not replicate the corrupted characters; use the
correct symbols/icons/typography they were meant to represent.

## 2. Dashboard ("Inventory") — default view

### Hero
Eyebrow label, H1, subcopy, "Add item" primary button (opens Item modal in `add` mode).

### Metrics row (4 tiles)
Total products (count) · Stock quantity (sum of `stock` across all items, units mixed — see
`BUSINESS_RULES.md` §10) · Low stock items (count where status ≠ `in`) · Inventory value
(currency, `Σ stock×price`). Footer captions are partly hardcoded, not computed (`+4.7%` — see
`BUSINESS_RULES.md` §13).

### Stock movement panel (form)
Fields, left to right: barcode/code lookup, quantity (label updates to show the matched item's
unit), movement type (Add/Consume), employee ID, and a conditional machine field —
**read-only machine-model display** by default, swapped for a **machine-unit select** when
`movement = consume` and the matched item is machine-linked. Live match/error text beneath the
form. Full validation rules in `BUSINESS_RULES.md` §2.

### Product inventory table
Columns: Product (name + SKU + barcode) · Machine model/Rack (machine name or "Store inventory" +
rack + department) · Category (+ criticality) · Stock (qty + unit) · Status badge · Actions (Edit,
Duplicate — **no Delete**).
Filters: free-text search (matches name/sku/barcode/department/category/criticality/machine
name/rack), department, machine model (`all` / `NONE` / specific), category, status
(`all`/`in`/`low`/`out`). Sortable columns: Product (alpha), Stock (numeric), toggle asc/desc.
Empty state message when filters produce zero rows.

### Sidebar (3 cards)
1. **Low stock alerts** — scrollable list, sorted by ascending stock, each row shows name/sku/
   barcode, criticality, remaining qty (or "Out of stock"), and a derived usage rate (see
   `BUSINESS_RULES.md` §10).
2. **Stock history** — detail panel + clickable list of the 5 most recent transactions (colored
   dot for add/consume, name, signed quantity). Clicking a row shows full detail: direction, qty
   + unit, product name, machine model, shift in-charge, timestamp, employee. Defaults to most
   recent transaction on load.
3. **Shift in-charge log** — "Current: {id}" label, a 2-field form (in-charge ID + effective
   datetime, defaulting to now), and the 5 most recent entries (desc by timestamp).

## 3. Analytics page

### Top controls
Reporting period select (Today / Last 7 days [default] / Last 30 days / Last 12 months) and a
Quantity/Value(₹) measure toggle affecting every figure on the page.

### Summary tiles (4)
Current stock (qty or value, all-time) · Consumed (period) · Stock received (period) · Net
movement (period, received − consumed). Labels and captions swap wording based on the measure
toggle.

### Consumption comparison (wide card)
"Compare by" select (Department / Machine model / Machine unit) drives a series picker: a
dropdown to add one entry at a time plus removable checkbox chips, capped at 5 selected series.
Renders as a hand-built inline SVG line chart (no charting library) with per-point native
tooltips (`<title>`) and a color-keyed legend below. Empty state when zero series selected.

### Breakdown cards (2)
"Current [qty/value] by department" (all-time snapshot, horizontal bar list) and "Consumed
[qty/value] by category" (period-filtered, horizontal bar list). See `BUSINESS_RULES.md` §10 for
the period-scoping asymmetry between these two cards.

## 4. Machines page

### Top actions
"Add department", "Add machine model", "Add machine unit" — each opens its respective modal.

### Top grid (side-by-side)
- **Machine models panel** — search + department filter, scrollable list (name, department,
  vendor or "Vendor not set", ID, code badge). Add-only; no edit/delete.
- **Departments panel** — search, scrollable list (name, code, ID, code badge, delete button per
  row). Add + conditional delete (blocked with a toast if in use).

### Bottom section (full width)
- **Machine units panel** — search + machine-model filter, scrollable list (unit name, parent
  model name, unit ID shown as the badge). Add-only; no edit/delete.

## 5. Modals

| Modal | Fields | Notes |
|---|---|---|
| Item (Add/Edit/Duplicate) | name, department, machine, category, criticality, rack, unit of measure, opening stock, threshold, price | Title/hint/submit-button label change per mode; edit/duplicate require ≥1 changed field (see `BUSINESS_RULES.md` §4) |
| Add Department | name only | ID + code auto-generated, shown as read-only hint text |
| Add Machine Model | name, department, cost, vendor (optional), warranty date (optional) | ID + code auto-generated |
| Add Machine Unit | machine model, unit name | ID auto-generated |

## 6. Responsive breakpoints

`REFERENCE_BEHAVIOUR`, structural (not just cosmetic) reflow points:
- **≤1100px**: movement form collapses from 6 columns to 4, submit button spans full width.
- **≤960px**: metric grids drop to 2 columns; dashboard workspace, analytics grid, and machines
  top-grid stack to a single column; sidebar becomes 2-column.
- **≤620px**: full mobile stack — single-column everywhere, nav wraps below the brand, sync
  indicator hidden entirely, all multi-column forms collapse to one column.

`PRODUCTION_REQUIREMENT` (CLAUDE.md): the rebuilt UI must remain responsive at equivalent
breakpoints; exact pixel values are not sacred, the *behaviour* (usable on mobile/tablet/desktop)
is what must be preserved.

## 7. Terminology glossary (preserve in production copy)

Product = inventory item · SKU = product code · Machine model vs Machine unit (model = type,
unit = physical instance) · Rack = storage location · Criticality/VED = Vital/Essential/Desirable
· Movement = a single add/consume stock transaction · Shift in-charge = the person responsible
for a given time window · Store inventory = an item not linked to any machine (`machineId ===
'NONE'`).
