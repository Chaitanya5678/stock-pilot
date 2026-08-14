# PRODUCT.md — StockPilot Product Overview

Tags used throughout: `REFERENCE_BEHAVIOUR` (what the prototype does today), `PRODUCTION_REQUIREMENT`
(mandated by CLAUDE.md regardless of the prototype), `ASSUMPTION` (a reasonable default we are
proposing, not confirmed), `OPEN_QUESTION` (needs a decision before/while building).

## 1. What it is

`REFERENCE_BEHAVIOUR`: The reference is a single static HTML file implementing an MRO
(Maintenance, Repair & Operations) inventory manager. Its on-page branding says "Stockly"; the
repo/project is "StockPilot". `ASSUMPTION`: "StockPilot" is the product name going forward —
"Stockly" is leftover prototype branding and carries no business meaning.

The app tracks spare parts, tools, consumables and PPE ("inventory items"/"products") consumed
while maintaining physical equipment ("machines"), organized by plant "departments". Parts are
classified with VED criticality (Vital / Essential / Desirable) and a fixed 6-category taxonomy
(Capital Spares, Operating Spares, Rotable Spares, Consumables, Durable Tools, Safety & PPE) — a
standard MRO/spares-management convention.

## 2. Target users (inferred, not stated)

`ASSUMPTION`: The reference has no login, no user identity beyond a static "AP" avatar, and no
role concept. The workflows imply at least two functional personas:
- **Store/inventory staff**: record stock movements, look up parts, manage the item catalog.
- **Maintenance/ops staff**: consume parts against a specific machine unit, act as shift in-charge.

`OPEN_QUESTION`: Whether these map to real, separate roles (see `MVP_SCOPE.md` §Roles) is not
answered by the reference and must be decided explicitly — CLAUDE.md requires role-based
authorization for the MVP, but the prototype gives zero signal about what the roles are.

## 3. Primary user workflows (as demonstrated by the reference)

1. **Record a stock movement** — scan/type a barcode or product code on the Dashboard, choose
   *Add stock* or *Consume stock*, enter quantity (+ employee ID, + machine unit if consuming
   against a machine-linked part), submit. Inventory, alerts, transaction history and analytics
   all update immediately.
2. **Browse and find inventory** — search and filter the product table by department, machine
   model, category, and stock status; sort by name or stock quantity.
3. **Maintain the product catalog** — add, edit, or duplicate an inventory item via a modal form.
   There is no delete for products.
4. **Maintain the equipment/department register** — add departments, machine models, and machine
   units. Departments can be deleted only if unused by any item or machine. Machine models and
   machine units cannot be edited or deleted.
5. **Log shift hand-offs** — record a shift in-charge ID with an effective timestamp. The system
   derives "who was in charge" at any point in time (including retroactively, for movements
   recorded before the shift log entry existed).
6. **Review analytics** — pick a reporting period (today / 7d / 30d / 12mo) and a measure
   (quantity or ₹ value); compare consumption across up to 5 departments, machine models, or
   machine units on a line chart; view current stock and consumption breakdowns.

## 4. Explicitly out of scope in the reference

No authentication, no users/roles, no multi-tenant/org concept, no reporting export, no
notifications/emails, no barcode-scanner hardware integration (free-text input only, "scan"
just means "type into the same box"), no supplier/purchase-order workflow, no budget/approval
workflow, no delete for products/machines/units, no edit for machines/units/departments/shift
entries.

## 5. Feature inventory by screen

| Screen | Purpose |
|---|---|
| Dashboard ("Inventory") | Summary metrics, stock movement form, product table with filters, low-stock alerts, transaction history, shift in-charge log |
| Analytics | Period/measure-scoped KPIs, multi-series consumption comparison chart, current-stock and consumed breakdowns |
| Machines | Machine model register, department register, machine unit register |

See `UI_REFERENCE.md` for full screen/component detail and `BUSINESS_RULES.md` for the rules
behind each workflow.

## 6. Known product-level ambiguities

- `OPEN_QUESTION`: No roles/permissions model exists in the reference — see `MVP_SCOPE.md`.
- `OPEN_QUESTION`: "Employee ID" and "shift in-charge ID" are free-text fields with no roster
  entity. Once authentication exists, should these be replaced by the logged-in user, or remain
  free text (e.g. for shared/kiosk terminals where the logged-in user isn't the person on the
  floor)?
- `ASSUMPTION`: The reference is single-tenant/single-store; nothing suggests multi-warehouse or
  multi-org support is needed for MVP.
