# DOMAIN.md — Entities, Fields, and Relationships

Reverse-engineered from the in-memory JS state and mutation functions in `index.html`. Field
lists below reflect the reference's *actual* shape, not a proposed schema — normalization notes
are called out separately (`PRODUCTION_REQUIREMENT`).

## 1. Entity summary

| Entity | Reference identifier scheme | Editable in UI | Deletable in UI |
|---|---|---|---|
| Department | `DEPT-{seq}`, seq starts at 6 (5 seeded) | No | Yes, only if unused |
| Machine (model) | `MCH-{seq}`, seq starts at 5 (4 seeded) | No | No |
| MachineUnit | `UNIT-{seq}`, seq starts at 402 (6 seeded, seeded IDs don't follow this pattern) | No | No |
| InventoryItem (Product) | `Date.now()` (numeric, ms epoch) | Yes | No |
| StockMovement (Transaction) | `TXN-{Date.now()}` at runtime; seeded rows use `TXN-0001..0012` | No (append-only) | No |
| ShiftInchargeEntry | `SHIFT-{Date.now()}` at runtime; seeded rows use `SHIFT-001..004` | No (append-only) | No |
| "Activity" feed entries | none (tuple array) | n/a | n/a — `REFERENCE_BEHAVIOUR`: dead code, see `BUSINESS_RULES.md` §Dead code |

`PRODUCTION_REQUIREMENT`: `Date.now()`-derived IDs are collision-prone under any concurrent/
multi-user access and must become DB-generated keys (serial or UUID) in production.

## 2. Department

| Field | Type | Notes |
|---|---|---|
| id | string | `DEPT-###` |
| name | string, ≤40 chars | required, must be case-insensitively unique (`REFERENCE_BEHAVIOUR`) |
| code | string, 3 letters | auto-derived from `name` (strip non-letters, first 3, uppercase), de-duplicated by appending an incrementing counter (`DPT`, `DPT1`, `DPT2`...) if a collision occurs |

Seed data: Maintenance/MNT, Production/PRD, Utilities/UTL, Safety/SAF, Stores/STR.

Delete rule: blocked if any `InventoryItem.department === department.name` or
`Machine.department === department.name`.

## 3. Machine (equipment model)

| Field | Type | Notes |
|---|---|---|
| id | string | `MCH-###` |
| name | string, ≤60 chars | required |
| code | string | auto-derived same way as Department.code, deduped against other machine codes |
| department | **string (department name)**, not an id | `REFERENCE_BEHAVIOUR` — see normalization note below |
| cost | number ≥ 0 | "model cost", not currently used in any calculation |
| vendor | string, ≤60 chars, optional | free text |
| warrantyUntil | date string, optional | captured but not surfaced anywhere (no expiry alerts) |

`PRODUCTION_REQUIREMENT`: `Machine.department` must become a foreign key to `Department.id`.
`ASSUMPTION`: this is a pure implementation fidelity fix — nothing in the reference depends on
department renaming (departments can't be renamed in the UI), so normalizing does not change
observed behaviour.

**Implemented**: `machines.departmentId` is a required FK to `departments.id` (`onDelete:
Restrict`) in `prisma/schema.prisma`.

`OPEN_QUESTION`: Is machine-model name required to be unique (per department or globally)? The
reference does not enforce this — only the derived `code` is deduplicated.

## 4. MachineUnit (physical equipment unit)

| Field | Type | Notes |
|---|---|---|
| id | string | `UNIT-###` |
| modelId | string | FK → `Machine.id`, required |
| name | string, ≤50 chars | required, no uniqueness check |

## 5. InventoryItem (Product)

| Field | Type | Notes |
|---|---|---|
| id | number | see ID scheme note above |
| name | string, ≤45 chars | required |
| sku | string | auto: `{deptCode}-{machineCode}-{categoryCode}-{criticalityCode}-{seq}` |
| barcode | string | auto: `8901001` + seq, zero-padded to 6 digits (fake GS1-like prefix) |
| department | **string (department name)** | required; see normalization note |
| machineId | string | FK → `Machine.id`, or literal `'NONE'` meaning "store inventory, not linked to a machine" |
| category | enum | Capital Spares / Operating Spares / Rotable Spares / Consumables / Durable Tools / Safety & PPE |
| type (criticality) | enum | Vital / Essential / Desirable (VED) |
| rack | string, ≤30 chars | required, free-text location |
| unit | enum | Each / Pair / Kg / Litre / Meter / Set (unit of measure) |
| stock | number ≥ 0, 2dp | current on-hand quantity |
| threshold | number ≥ 1 (HTML) / ≥ 0 (JS) | low-stock threshold — see validation mismatch in `BUSINESS_RULES.md` |
| price | number ≥ 0, 2dp | unit price, ₹ |

`sku`/`barcode` share one global `nextProductSequence` counter (starts at 1008), incremented once
per created/duplicated item.

`PRODUCTION_REQUIREMENT`: `InventoryItem.department` must become a FK to `Department.id`, and
`InventoryItem.machineId` should use a nullable FK instead of the `'NONE'` string sentinel.

**Implemented**: `inventory_items.departmentId` is a required FK; `machineId` is a nullable FK
(`null` = store inventory, replacing the `'NONE'` sentinel). SKU/barcode are DB-unique and
generated via `product_code_seq` — see `docs/DECISIONS.md` "Identifiers".

`OPEN_QUESTION`: Selecting a machine model in the item form auto-fills `department` to that
machine's department, but the field remains editable afterward — so an item's department can
diverge from its linked machine's department. Is that divergence intentional (e.g. a part
administratively owned by one department but consumed on another department's machine) or a gap
that should be enforced?

## 6. StockMovement (Transaction)

| Field | Type | Notes |
|---|---|---|
| id | string | `TXN-####` |
| productId | number | FK → `InventoryItem.id` |
| machineUnitId | string, optional | FK → `MachineUnit.id`; only ever populated for `consume` movements against a machine-linked item |
| direction | enum | `add` \| `consume` |
| quantity | number > 0 | in the item's unit of measure |
| employee | string | free text, defaults to `'Unassigned'` if blank; no Employee entity exists |
| timestamp | ISO string | when recorded |
| inchargeId | string | **snapshot**, computed at write time via `getInchargeAt(timestamp)` — not a live FK |

`ASSUMPTION`: `inchargeId` should remain a captured, immutable snapshot in production (like an
audit log), not a live-recomputed FK — "who was in charge when this happened" is a historical
fact that shouldn't change if the shift log is edited later. This matters because the reference
has no edit/delete for shift entries, so the question has never actually been tested — flag as
`OPEN_QUESTION` if shift-log editing is ever added.

**Implemented, with one change beyond the reference**: the free-text `employee` field was split
into `performedByUserId` (required FK to `users.id` — the authoritative actor, per
`docs/DECISIONS.md` "Audit identity") and `employeeLabel` (optional, display-only, never used for
authorization). `inchargeId` is stored exactly as described above: a snapshot string, captured at
write time, not a live FK. A `reason` column and a `balanceAfter` snapshot were also added — see
`docs/DECISIONS.md` "Stock movement model".

## 7. ShiftInchargeEntry

| Field | Type | Notes |
|---|---|---|
| id | string | `SHIFT-###` |
| inchargeId | string, ≤20 chars | required, free text — no Employee/roster entity |
| timestamp | ISO string | "effective from" — required, no future/past bounds validation |

Append-only. "Current in-charge" = the entry with the latest `timestamp` that is `<=` now.
`getInchargeAt(t)` = the entry with the latest `timestamp <= t`, or "No in-charge logged".
No overlap/uniqueness validation — two entries can share a timestamp (last one wins by sort
stability... `OPEN_QUESTION`: undefined tie-break behaviour if two entries share a timestamp).

## 8. "User" / authentication — does not exist in the reference

`PRODUCTION_REQUIREMENT`: A real `User` entity with credentials and role(s) must be introduced;
the reference has nothing to migrate from here (see `DATA_MIGRATION.md`).

**Implemented**: `users` table — `id, email (unique), passwordHash, displayName, role (enum:
ADMIN/STORE_MANAGER/STORE_OPERATOR/MAINTENANCE_USER), isActive, isSeedUser, createdAt, updatedAt`.
One role per user (no join table) — see `docs/DECISIONS.md` "MVP roles". `isSeedUser` flags
development-only accounts so they're never mistaken for real ones (`docs/DATA_MIGRATION.md`).

## 9. Relationship diagram (target/normalized, not literal reference shape)

```
Department 1───* Machine
Department 1───* InventoryItem
Machine    1───* MachineUnit
Machine    1───* InventoryItem   (nullable FK — "store inventory" has no machine)
InventoryItem 1───* StockMovement
MachineUnit   1───* StockMovement (nullable — only for consume events against machine-linked items)
ShiftInchargeEntry (independent timeline; StockMovement.inchargeId captured as a snapshot, not FK)
User ──→ StockMovement.performedByUserId (required FK — implemented, see §6 and DECISIONS.md)
```

This diagram is now the literal implemented schema (`prisma/schema.prisma`), not just a target.

## 10. Entities that exist in reference state but render nowhere

`REFERENCE_BEHAVIOUR`: the `activity` array (recent-activity feed) is populated by every
mutating action (`item added`, `stock updated`, etc.) and even has a `renderActivity()` function,
but there is no `#activityList` element anywhere in the current HTML and `renderActivity()` is
never called from `render()`. This is dead/orphaned code — see `BUSINESS_RULES.md` and
`MVP_SCOPE.md` for the disposition question.
