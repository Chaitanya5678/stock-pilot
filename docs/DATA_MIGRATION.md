# DATA_MIGRATION.md — Seed Data and the "Nothing to Migrate From" Fact

## 1. There is no real data to migrate

`REFERENCE_BEHAVIOUR`: The reference stores everything in plain JS `let` variables, re-initialized
from literals on every page load. There is no `localStorage`, no cookie, no backend call — closing
the tab or refreshing discards all changes. Consequently **there is no existing user data anywhere
to migrate** — "migration" here means only: (a) stand up the production schema, and (b) decide
whether the reference's literal seed data becomes the production seed data.

`OPEN_QUESTION`: should the exact reference seed data (§2 below) ship as the production seed for
demos/dev environments, or should production start empty and seed only what's needed for tests?

**Resolved for development**: `prisma/seed.ts` reproduces the reference's demo scenario (§2) as
**development-only** data — every seeded `User` has `isSeedUser: true` and a `@stockpilot.local`
email, and the script is idempotent (it exits immediately if any `Department` already exists, so
`npm run db:seed` is safe to re-run). Whether this same data should exist in a production
environment (vs. production starting empty) is still open — the seed script as written should
only ever be pointed at a dev/test database.

## 2. Seed data inventory (as literally coded in the reference)

**Departments (5)**: Maintenance/MNT, Production/PRD, Utilities/UTL, Safety/SAF, Stores/STR.

**Machines (4)**: Compressor Series C (CMP, Maintenance), Boiler High Pressure (BOL, Utilities),
Packaging Line A (PKG, Production), Safety Store (SFT, Safety, cost 0 — used as the "no real
machine, just a bucket for safety stock" model).

**Machine units (6)**: 1 compressor unit, 3 boiler units, 1 packaging line unit, 1 safety-store
unit.

**Inventory items (7)**, spanning all 6 categories and all 3 criticalities, including one
deliberately zero-stock item (Filter, Air — demonstrates the "out of stock" status) and one
deliberately below-threshold item (Oil, Hydraulic — demonstrates "low stock").

**Movement history (12 rows)**: synthetic, spans from 4 hours ago to 230 days ago, deliberately
covering all 4 analytics periods (today/7d/30d/12mo) and mixing add/consume directions, so every
report has non-empty data at every zoom level. `ASSUMPTION`: this data was hand-crafted for demo
completeness, not derived from any real operational pattern — do not treat quantities/timings as
meaningful business benchmarks.

**Shift in-charge log (4 rows)**: spans from 20 days ago to 6 hours ago, deliberately overlapping
the movement-history timestamps so `getInchargeAt()` resolves a real value for every seeded
movement.

## 3. Mapping reference shape → normalized schema

| Reference field | Production column | Change |
|---|---|---|
| `Machine.department` (name string) | `machines.department_id` | normalize to FK |
| `InventoryItem.department` (name string) | `inventory_items.department_id` | normalize to FK |
| `InventoryItem.machineId === 'NONE'` | `inventory_items.machine_id IS NULL` | sentinel → nullable FK |
| `InventoryItem.id` (`Date.now()`) | `inventory_items.id` | client timestamp → DB-generated key |
| `StockMovement.id` (`TXN-{Date.now()}` / seeded `TXN-####`) | `stock_movements.id` | unify to one DB-generated scheme |
| `ShiftInchargeEntry.id` (`SHIFT-{Date.now()}` / seeded) | `shift_incharge_log.id` | unify to one DB-generated scheme |
| `nextProductSequence`, `nextDeptSeq`, `nextMachineSeq`, `nextUnitSeq` (client-held counters) | DB sequences (or code-generation queries against existing rows) | move server-side |

`ASSUMPTION`: human-facing codes (`DEPT-001`, `MCH-001`, `UNIT-101`, SKU, barcode) are worth
keeping as *display* identifiers even though the DB primary key becomes a proper generated ID —
i.e. add a separate unique `code`/`sku`/`barcode` column rather than trying to make the display
code itself the primary key, so generation logic doesn't have to guarantee PK-safety under
concurrency.

**Implemented, with one narrowing**: `departments.code` / `machines.code` (e.g. `MNT`, `CMP`) and
`inventory_items.sku` / `barcode` were implemented as separate unique display columns, exactly as
proposed. The reference's synthetic `DEPT-001`/`MCH-001`/`UNIT-101`-style *record* IDs were
**not** reproduced as a display column — they were purely internal array-index-like identifiers
in the reference (never shown to a user as a meaningful business code the way SKU/barcode are),
so the DB-generated UUID primary key replaces them directly with no parallel display-ID scheme.
If a human-readable *record* reference (as opposed to a code like `MNT`) turns out to be needed
later (e.g. for support/ticketing), that's a new requirement, not a gap in this migration.

## 4. Migration sequencing (initial schema stand-up)

1. `departments` (no dependencies)
2. `machines` (depends on `departments`)
3. `machine_units` (depends on `machines`)
4. `inventory_items` (depends on `departments`, `machines`)
5. `stock_movements` (depends on `inventory_items`, `machine_units`)
6. `shift_incharge_log` (no dependencies)
7. `users` (net-new, no dependencies) — schema uses the roles approved in `docs/DECISIONS.md`
   "MVP roles"

**Implemented**: two migrations exist — `20260814141708_init` (all tables above) and
`20260814142012_add_product_code_sequence` (the `product_code_seq` Postgres sequence backing
SKU/barcode generation, see §5 below). Seed data loads via `prisma/seed.ts`
(`npm run db:seed`), separate from schema migrations, as planned.

## 5. Shared sequence — implemented as a real Postgres sequence

`REFERENCE_BEHAVIOUR`: SKU and barcode generation shared one client-held counter
(`nextProductSequence`), started at `1008` for no structural reason (just where the reference's
hand-written seed data happened to leave off).

**Implemented**: `product_code_seq` is a real Postgres sequence (`CREATE SEQUENCE
product_code_seq START WITH 1000`), incremented atomically via `nextval()` inside the same
transaction that creates the item — see `docs/DECISIONS.md` "Identifiers." It starts at `1000`
(an arbitrary round number, not `1008`) since there is no reason to reproduce the reference's
exact numbering — the dev seed script's 7 items consume `1000`-`1006`, verified collision-free
against the `sku`/`barcode` unique constraints. Unlike the reference, this fully removes the
"remember to advance the counter past the seed data" risk: `nextval()` is what advances it, so
seeding and normal item creation can never race or collide by construction.
