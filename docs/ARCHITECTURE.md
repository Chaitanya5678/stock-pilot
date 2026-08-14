# ARCHITECTURE.md — Architecture (Foundation Implemented)

Originally a proposal; the foundation described here (schema, domain layer, the
`recordStockMovement`/`createInventoryItem` use cases, auth) is now implemented and verified.
The UI layer and the remaining application-layer use cases (edit item, add department/machine/
machine-unit, shift log) are not yet built — see `docs/MVP_SCOPE.md` §8 for what's done. Tags:
`ASSUMPTION` for anything not dictated by CLAUDE.md, the reference, or `docs/DECISIONS.md`.

## 1. Layering (CLAUDE.md §4, mandatory)

```
UI (Next.js — not yet built)
   → Application layer   src/application/**   (use-cases: recordStockMovement, createInventoryItem, authenticate, ...)
      → Domain layer      src/domain/**        (business rules: stock status, movement validation,
                                                  code generation, RBAC, shift-in-charge derivation)
         → Persistence     src/infrastructure/db/prismaClient.ts + Prisma (PostgreSQL)
```

Rules (as implemented):
- The domain layer (`src/domain/**`) is pure TypeScript — no Prisma import, no I/O, fully unit
  testable. It knows business rules but not how they're persisted.
- The application layer (`src/application/**`) orchestrates: it calls domain functions to
  validate, then talks to Prisma inside a transaction. This is where `requirePermission()` is
  called — authorization is enforced here, not in the UI.
- Every stock-changing use-case (`recordStockMovement`) follows the same shape: check permission
  → validate (domain) → verify item/machine-unit exist → atomic conditional balance update →
  write the movement row → commit together. See `docs/DECISIONS.md` "Concurrency control."
- `src/infrastructure/**` holds framework/library-facing code with no business rules: the Prisma
  client singleton, password hashing, session signing/verification.

## 2. Data model (as implemented)

See `prisma/schema.prisma` for the authoritative definition; summarized here:

```
users               (id uuid, email UNIQUE, passwordHash, displayName, role enum, isActive,
                      isSeedUser, createdAt, updatedAt)
departments         (id uuid, name UNIQUE, code UNIQUE, createdAt, updatedAt)
machines            (id uuid, name, code UNIQUE, departmentId FK, cost, vendor, warrantyUntil,
                      createdAt, updatedAt)
machine_units       (id uuid, machineId FK, name, createdAt, updatedAt)
inventory_items     (id uuid, name, sku UNIQUE, barcode UNIQUE, departmentId FK,
                      machineId FK NULLABLE, category enum, criticality enum, rack,
                      unitOfMeasure enum, stock, threshold, price, createdAt, updatedAt)
stock_movements     (id uuid, itemId FK, machineUnitId FK NULLABLE, direction enum, quantity,
                      reason NULLABLE, balanceAfter, performedByUserId FK, employeeLabel NULLABLE,
                      inchargeId NULLABLE snapshot, createdAt)   -- append-only
shift_incharge_log  (id uuid, inchargeId, effectiveAt, createdAt)   -- append-only
```

All foreign keys use `onDelete: Restrict` — referential integrity is enforced by the database,
not application convention. Every table has DB-generated UUID primary keys (see
`docs/DECISIONS.md` "Identifiers"); a separate Postgres sequence (`product_code_seq`) backs
SKU/barcode numeric suffixes.

No table exists for the reference's "activity feed" — see `docs/DECISIONS.md` "Reference
dead-code and known asymmetries" (deferred, not built).

## 3. Stock consistency (implemented)

Implemented exactly as required by CLAUDE.md §4 and user instruction H: `recordStockMovement`
(`src/application/stock/recordStockMovement.ts`) runs inside a single Prisma interactive
transaction. The balance update is one conditional SQL statement —
`UPDATE inventory_items SET stock = stock + $delta WHERE id = $id AND stock + $delta >= 0
RETURNING stock` — so the "would this go negative" check is evaluated against the row's
currently-committed value at write time, not a value read earlier in the request. Zero rows
updated ⇒ the transaction throws and rolls back before any `StockMovement` row is written. See
`docs/DECISIONS.md` "Concurrency control" and the concurrent-consume test in
`src/application/stock/recordStockMovement.test.ts`.

## 4. Authentication & authorization (implemented)

- **Authentication**: `src/infrastructure/auth/{password,session,currentUser}.ts` — bcrypt
  password hashing, a `jose`-signed JWT in an httpOnly cookie as the session. Routes:
  `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. See `docs/DECISIONS.md`
  "Authentication mechanism" for why this isn't NextAuth/Auth.js.
- **Authorization**: `src/domain/rbac/permissions.ts` defines the role → permission map; every
  mutating application-layer function calls `requirePermission(role, permission)` before touching
  the database. Enforced server-side only — there is no UI yet for a role check to be bypassed
  through, but the pattern (check in the use-case, not the caller) is intended to hold once one
  exists.

## 5. Testing (implemented)

- **Unit tests** (`src/domain/**/*.test.ts`, `src/infrastructure/auth/*.test.ts`): pure logic, no
  I/O — stock status, movement validation, code generation/dedup, shift-in-charge derivation,
  RBAC permission checks, password hashing, session round-trips.
- **Integration tests** (`src/application/**/*.test.ts`): run against a real, isolated
  `stockpilot_test` PostgreSQL database (never mocked — CLAUDE.md §11 requires this for
  business-critical logic, and instruction H specifically requires verifying real Postgres
  transaction/concurrency behaviour). `src/test/resetDatabase.ts` truncates between tests;
  `vitest.global-setup.ts` runs `prisma migrate deploy` against the test database before the
  suite starts, so it can never silently drift from `stockpilot_dev`'s schema.
- E2E tests (Playwright) are intentionally not set up yet — there is no UI to exercise. Add once
  the critical workflows in `docs/PRODUCT.md` §3 have screens.

## 6. Explicitly excluded (per user instruction and CLAUDE.md §3)

Microservices, Kubernetes, event sourcing, CQRS, a workflow engine, AI infrastructure, or any
additional abstraction layer beyond the four listed in §1. Single deployable Next.js app, single
PostgreSQL database.

## 7. Migrations (implemented)

Two migrations exist under `prisma/migrations/`: the initial schema, and a follow-up adding
`product_code_seq`. `npm run db:migrate` (dev, creates+applies) and `npm run db:migrate:deploy`
(applies existing migrations, used in tests and would be used in CI/deploy) wrap
`prisma migrate dev` / `prisma migrate deploy`. There is no pre-existing production data to
migrate — see `docs/DATA_MIGRATION.md`.
