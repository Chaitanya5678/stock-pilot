# BUSINESS_RULES.md — Rules, Calculations, and Validation

Extracted from `index.html` JS. Treated as behavioural specification per CLAUDE.md. Tags:
`REFERENCE_BEHAVIOUR`, `PRODUCTION_REQUIREMENT`, `ASSUMPTION`, `OPEN_QUESTION`.

## 1. Stock status classification

```
out = stock === 0
low = 0 < stock <= threshold
in  = stock > threshold
```
`REFERENCE_BEHAVIOUR`. Used for the status badge, low-stock alerts, and the dashboard "Low
stock items" metric (`low` + `out` count together).

## 2. Stock movement rules (Dashboard → "Stock movement" form)

Submit validation, in order — first failure wins:

1. Lookup must resolve: `productLookup` value must case-insensitively match an item's `sku` or
   exactly match its `barcode`. Failure → toast "Enter a valid barcode or product code".
2. `quantity` must be a finite number `> 0`. Failure → toast "Enter a quantity greater than zero".
3. If `movement === 'consume'` and the item is machine-linked (`machineId !== 'NONE'`), a machine
   unit **must** be selected. Failure → toast "Select the machine unit consuming this spare".
4. If a machine unit is selected, it must belong to the same machine model as the item
   (`unit.modelId === item.machineId`). Failure → toast "Choose a unit that belongs to this
   machine model".
5. If `movement === 'consume'`, `quantity` must not exceed current `item.stock`. Failure → inline
   error + toast "Insufficient stock for this movement". **Stock is never allowed to go negative
   via this form.**

On success: `item.stock += (add ? +qty : -qty)`; a `StockMovement` is unshifted onto history with
`inchargeId = getInchargeAt(now)`; an activity-feed entry is pushed (see §7, currently
unrendered); the form resets (lookup cleared, quantity reset to `1`); full re-render; success
toast.

`REFERENCE_BEHAVIOUR`: The stock mutation and the movement-record insertion happen as two
sequential, non-atomic statements in client memory.
`PRODUCTION_REQUIREMENT` (CLAUDE.md §4): in production this must be a single atomic transaction:
validate → verify sufficient stock → insert movement row → update balance → all-or-nothing.

`OPEN_QUESTION`: No upper bound is enforced on `add` beyond the number input's `max="99999"`
HTML attribute (not re-checked in JS, and not enforced as any kind of storage-capacity rule).
Is there a real ceiling business rule, or is `max` purely a UI sanity guard? (Not enforced in the
production schema/domain layer either — no ceiling was specified.)

**Status: implemented as specified above, atomically.** `PRODUCTION_REQUIREMENT` — see
`docs/DECISIONS.md` "Concurrency control for stock updates" (APPROVED): the balance update and
the movement insert happen inside one database transaction, with the sufficiency check performed
as an atomic conditional `UPDATE` re-evaluated against the row's committed value, not a value
read earlier in the request — closing the race the reference's non-atomic version left open.

A third movement direction, `ADJUSTMENT`, was added beyond the reference's add/consume (see
`docs/DECISIONS.md` "Stock movement model") — a `PRODUCTION_REQUIREMENT`-driven addition, not a
reference behaviour, required to give Product Edit's former stock-editing capability (§3 below)
an auditable replacement. An adjustment requires a non-empty `reason` and, like add/consume, can
never take stock below zero.

## 3. Direct product-edit stock rule — CONFLICT with CLAUDE.md (RESOLVED)

`REFERENCE_BEHAVIOUR`: Editing an existing product via the "Edit inventory item" modal lets the
user change the "Opening quantity" (`stock`) field directly. On save, `Object.assign(existing,
values)` overwrites `stock` **with no `StockMovement` created and no audit trail** — the number
just changes.

`PRODUCTION_REQUIREMENT` (CLAUDE.md §4): "Never implement stock changes as an untracked direct
quantity mutation." This directly contradicted the reference behaviour above.

**Resolved — see `docs/DECISIONS.md` "Product Edit does not change stock" (APPROVED).** The user
chose option (a): stock is never editable through catalog/product-edit; every stock change goes
through `recordStockMovement` (ADD, CONSUME, or ADJUSTMENT with a required reason). Enforced
structurally — nothing outside `src/application/stock/recordStockMovement.ts` writes to
`InventoryItem.stock`. A future item-edit use case must not accept `stock` as an updatable field.

`OPEN_QUESTION`: which resolution to take. Does not block building everything else.

## 4. Add / Edit / Duplicate no-op guard

`REFERENCE_BEHAVIOUR`: Edit and Duplicate compare a JSON signature of the submitted values
(`name, department, machineId, category, type, rack, unit, stock, threshold, price`) against a
baseline captured when the modal opened. If nothing changed, submission is blocked with a toast
("No changes detected to save" / "Make a change before creating a duplicate"). Add has no such
guard (nothing to compare against).

`ASSUMPTION`: This is a UX guard against accidental no-op saves, not a business rule with
downstream effects — safe to keep as-is in production.

## 5. Product code / barcode generation

```
sku     = `{deptCode}-{machineCode}-{categoryCode}-{criticalityCode}-{seq}`
barcode = `8901001` + zeroPad(seq, 6)
```
Both consume the same global, ever-incrementing `seq` (starts at `1008`). `deptCode` /
`machineCode` come from the Department/Machine `code` field; `categoryCode` / `criticalityCode`
are a fixed lookup table (e.g. Operating Spares → `OSP`, Vital → `V`).

`REFERENCE_BEHAVIOUR`: uniqueness is guaranteed only because `seq` always increments — the
prefix segments can repeat freely.
`PRODUCTION_REQUIREMENT`: `seq` must become a DB-safe sequence (not a client-held counter) to
survive concurrent creation and page reloads.
`ASSUMPTION`: The exact code format (`8901001######`, dash-joined SKU) is worth preserving for UI
fidelity but has no real GS1/barcode-standard meaning — do not treat it as a real barcode
checksum/standard.

## 6. Department / Machine code generation and uniqueness

```
code = first 3 letters of name (non-letters stripped), uppercased
if code already taken → append 1, 2, 3... until free
```
`REFERENCE_BEHAVIOUR`, applies identically to Department and Machine `code`. Department **name**
is required unique (case-insensitive); Machine **name** is not checked for uniqueness at all —
only its derived code is deduplicated (`OPEN_QUESTION`, see `DOMAIN.md` §3).

## 7. Department deletion guard

`REFERENCE_BEHAVIOUR`: A department can be deleted only if zero inventory items and zero
machines reference it (matched by name). Otherwise blocked with a toast reporting the counts.
No equivalent guard exists for machines or machine units because they cannot be deleted at all
in the reference.

**Implemented**: `deleteDepartment` counts dependent `machines`/`items` (matched by FK now, not
name) inside the same transaction as the delete, and produces the same "Cannot remove X: in use
(N items, M machines)" message. The schema's `onDelete: Restrict` on every FK into `departments`
is a second, database-level backstop against the same race the reference never had to worry
about (single-threaded browser state) — see `docs/DECISIONS.md` "Master data deletion scope."
No cascade of any kind: machines, machine units, inventory items, and stock movements are never
deleted or modified by a department deletion (attempt).

## 8. Shift in-charge derivation

```
getInchargeAt(t) = the ShiftInchargeEntry with the latest timestamp <= t, else "No in-charge logged"
```
`REFERENCE_BEHAVIOUR`: Applied both to freshly-seeded/recorded movements (assigns the in-charge
"as of" the movement's own timestamp) and to the "Current: …" display (evaluated at `now`). This
makes shift assignment fully retroactive/historical — adding a shift-log entry with a past
effective timestamp can change how *future* renders describe *past* movements' in-charge, but
never rewrites what was actually stored on old movement rows (their `inchargeId` was captured at
insert time and is immutable, see `DOMAIN.md` §6).

`OPEN_QUESTION`: undefined tie-break if two `ShiftInchargeEntry` rows share the exact same
timestamp.

## 9. Quick stock adjustment (`adjustStock`) — unreachable in current UI

`REFERENCE_BEHAVIOUR`: An `adjustStock(id, change)` function exists, guards against negative
stock, and is wired via delegated click listener to any element with `data-adjust`/`data-change`
attributes. **No such element is emitted anywhere in the current markup** — there is no +/-1
quick-adjust button in the product table. This is dead code in the current file.

`OPEN_QUESTION`: was a quick-adjust control intentionally removed from the UI, or is this a
half-finished feature that should be completed (e.g. +/-1 buttons in the table's Actions
column)? Do not assume either way — confirm before building it.

**Status: not implemented, per `docs/DECISIONS.md` "Reference dead-code and known asymmetries"
(APPROVED — explicit instruction to leave deferred).** If it is ever built, it must go through
`recordStockMovement` as an `ADJUSTMENT` with a reason, not a bespoke code path.

## 10. Analytics calculations

Reporting periods (`analyticsPeriod`):

| Period | Duration | Buckets |
|---|---|---|
| daily | 24h | 6 |
| weekly (default) | 7d | 7 |
| monthly | 30d | 6 |
| annual | 365d | 12 |

- **Current stock qty/value** — all-time snapshot over the full `inventory` array (`sum(stock)` or
  `sum(stock * price)`). **Not period-filtered.**
- **Consumed / received qty/value** — sum over `StockMovement`s with `timestamp >= periodStart`,
  split by `direction`.
- **Net movement** — received − consumed, in the selected measure, for the period.
- **Consumption comparison chart** — for the chosen dimension (`department` / `machine` / `unit`)
  and up to 5 selected series values, consume-only events are bucketed into `buckets` equal-width
  time slices across the period and summed per bucket per series. Rendered as an inline SVG
  polyline chart (no charting library).
- **"Current [qty/value] by department"** breakdown — all-time on-hand snapshot, **not**
  period-filtered.
- **"Consumed [qty/value] by category"** breakdown — period-filtered, consume events only.
- **Low-stock alert usage rate** — `perDay = totalConsumedByItem / max(1, daysSinceEarliestConsumeRecord)`,
  displayed as `/day`, `/week`, `/month`, or `/year` depending on magnitude, or "no history yet"
  if the item has no consume records at all. Computed over **all-time** history, independent of
  the analytics period selector.

  **Not implemented in the production low-stock alert card** (`src/application/inventory/listLowStockAlerts.ts`).
  This computation is categorized here, under Analytics, precisely because it *is* an analytics
  figure (an all-time consumption-rate derivation) — building the read-only alert card was
  explicitly scoped to exclude analytics, so the card shows name/SKU/barcode/criticality/current
  stock/threshold/status only, per `docs/UI_REFERENCE.md` §2 and `docs/MVP_SCOPE.md`.

`OPEN_QUESTION` (asymmetry): current-stock/department breakdown ignores the period selector while
consumption/category breakdown honors it. `ASSUMPTION`: this is intentional — current on-hand
stock has no "as of a past date" history in the reference data model (only a live `stock` number,
no point-in-time snapshots), so "current" can only ever mean "now". Reproducing a true historical
stock-as-of-date view would require deriving balances from the movement ledger — treat as a
possible future feature, not implied by the reference, and `OPEN_QUESTION` whether it belongs in
MVP.

`OPEN_QUESTION` (unit mixing): "Stock quantity" (dashboard metric) and the "quantity" measure in
analytics sum raw `stock` across items with different units of measure (Each + Litre + Kg + Pair +
Meter + Set all added together). This is dimensionally questionable but is exactly what the
reference computes. `ASSUMPTION`: preserve for MVP fidelity; flag to the business whether this
aggregate is meaningful or should be replaced/supplemented with per-unit-type breakdowns or a
value-only headline figure.

## 11. Field validation reference

| Field | Required | Constraints (as coded) | Enforcement |
|---|---|---|---|
| Movement: barcode/code | yes | must resolve to a product | HTML `required` + JS |
| Movement: quantity | yes | `0.01 ≤ x ≤ 99999`, step 0.01 | HTML min/max/step + JS `>0` check |
| Movement: employee ID | no | ≤20 chars, blank → "Unassigned" | none beyond maxlength |
| Movement: machine unit | conditional | required only for consume + machine-linked item | JS only |
| Item: name | yes | ≤45 chars | HTML + JS non-empty |
| Item: department/machine/category/criticality | yes | select, defaults to first option | HTML `required`, but selects always have a pre-selected value — see note below |
| Item: rack | yes | ≤30 chars | HTML + JS non-empty |
| Item: unit of measure | no | enum, defaults "Each" | none (no `required` attr) |
| Item: opening stock | yes | `0 ≤ x ≤ 99999`, step 0.01 | HTML min/max + JS finite ≥0 |
| Item: threshold | yes | HTML `min=1, max=9999`, no step (integer stepping) | JS only checks finite **≥ 0** — mismatched with HTML `min=1` |
| Item: price | yes | `x ≥ 0`, step 0.01 | HTML + JS finite ≥0 |
| Department: name | yes | ≤40 chars, case-insensitive unique | JS |
| Machine: name | yes | ≤60 chars, no uniqueness | HTML + JS non-empty |
| Machine: cost | yes | `x ≥ 0`, step 0.01 | HTML + JS finite ≥0 |
| Machine: vendor / warranty | no | ≤60 chars / date | none |
| Machine unit: model | yes | must reference existing machine | select |
| Machine unit: name | yes | ≤50 chars, no uniqueness | HTML + JS non-empty |
| Shift: in-charge ID | yes | ≤20 chars | HTML |
| Shift: timestamp | yes | datetime-local | HTML, no past/future bound |

`OPEN_QUESTION`: `select` elements marked `required` (department/machine/category/criticality on
the item form) always have a value pre-selected by default (e.g. category defaults to "Capital
Spares"), so a user can submit without ever deliberately choosing a value. Is silently accepting
the first enum option acceptable in production, or should these use a blank placeholder + true
required validation to force an explicit choice?

`PRODUCTION_REQUIREMENT`: All of the above must be re-validated server-side; the reference relies
on a mix of browser-native HTML5 constraint validation and client JS, neither of which a server
can trust.

## 12. Dead / unreachable code inventory

| Item | Where | Status |
|---|---|---|
| `activity` array + `renderActivity()` | throughout mutating handlers | Populated on every mutation, but `#activityList` doesn't exist and `renderActivity()` is never called. Dead. |
| `adjustStock()` + `[data-adjust]` handler | delegated click listener | No emitting UI element exists. Dead. |
| `.criticality-pill` CSS class | stylesheet | Defined, never applied in any rendered template. Cosmetic-only, harmless. |
| `codePart`/`getDeptCode` fallback branches | code/dept generation helpers | Fallback for "unknown category/department" is unreachable because those values only ever come from fixed `<select>` options populated from live state. Defensive dead code. |

`OPEN_QUESTION` for each: intentionally removed feature (safe to drop) vs. half-built feature
(should be completed)? Do not guess — confirm scope in `MVP_SCOPE.md` before deciding.

**Status: none of these were built.** Per `docs/DECISIONS.md` "Reference dead-code and known
asymmetries" (APPROVED), the activity feed and quick-adjust control stay deferred; the CSS class
and validation fallbacks were not ported at all since there is no UI yet to carry them.

## 13. Static/hardcoded UI copy that looks computed but isn't

`REFERENCE_BEHAVIOUR`: The dashboard metric tiles' footer text is partly literal, not derived
from data: "Live demo data ready to explore", "Mixed units across products", and — notably —
**"+4.7% from last month"** on the Inventory value tile is a hardcoded string, not a real
month-over-month calculation (there is no prior-month snapshot anywhere in the data model).

`PRODUCTION_REQUIREMENT`: Do not carry the "+4.7%" figure into production as if it were real; it
must either be computed from real historical data or removed. `OPEN_QUESTION`: is
month-over-month trending in MVP scope at all?
