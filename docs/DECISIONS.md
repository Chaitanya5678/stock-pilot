# DECISIONS.md — Approved Decisions

This is the authoritative decision log for StockPilot. Entries here are either decisions the user
explicitly approved, or technical choices made under an explicit delegation from the user (e.g.
"select the simplest mature option compatible with PostgreSQL and the application stack"). Where
a choice was made without that kind of explicit delegation, it is marked `PENDING` and recorded
as an `OPEN_QUESTION` instead of `APPROVED` — per CLAUDE.md, assumptions are never recorded as
approved decisions.

---

# Decision: MVP roles

Status: APPROVED

## Decision
The MVP uses four roles: `ADMIN`, `STORE_MANAGER`, `STORE_OPERATOR`, `MAINTENANCE_USER`, as
specified by the user. Each `User` has exactly one role (a single enum column, not a many-role
join table or per-user permission overrides).

## Rationale
Explicitly specified by the user as a `PRODUCTION_REQUIREMENT`, proposed by them and not derived
from the reference prototype (which has no role concept at all). Single-role-per-user is the
minimal structure that satisfies "keep RBAC simple" / "do not create an unnecessarily elaborate
permission framework."

## Consequences
`prisma/schema.prisma` defines `enum Role` and `User.role: Role`. Adding a second role to a user,
or per-user permission overrides, would require a schema change (a join table), not just a code
change — treated as future scope, not blocking.

---

# Decision: RBAC permission model

Status: APPROVED

## Decision
A small, closed permission set (`stock:add`, `stock:consume`, `stock:adjust`, `catalog:view`,
`catalog:manage`, `users:manage`) mapped per role in `src/domain/rbac/permissions.ts`, enforced
server-side at the start of every application-layer use case via `requirePermission()`. Final
approved matrix:

| Role | Permissions |
|---|---|
| `ADMIN` | Full access: all of the below, plus `users:manage`. |
| `STORE_MANAGER` | `stock:add`, `stock:consume`, `stock:adjust`, `catalog:view`, `catalog:manage`. |
| `STORE_OPERATOR` | `stock:add`, `stock:consume`, `catalog:view`. **No** `stock:adjust`, **no** `catalog:manage`. |
| `MAINTENANCE_USER` | `stock:consume` (machine/machine-unit-linked items only — see below), `catalog:view`. **No** `stock:add`, **no** `stock:adjust`. |

Additionally, `MAINTENANCE_USER` may only perform `CONSUME` against a machine-linked item
(`InventoryItem.machineId` set) — consuming a store-only item is rejected with
`ForbiddenError` regardless of an otherwise-valid request. Enforced in
`src/domain/stock/movementPermissions.ts` (`assertRoleCanPerformMovement`), called from
`recordStockMovement` after the item is loaded (the role/permission table alone can't express an
item-attribute-dependent rule).

## Rationale
STORE_OPERATOR adjustment access was the one previously-open question here: the user's original
role description said "stock adjustments where permitted" without defining the condition. The
user has now explicitly resolved it — **STORE_OPERATOR does not get `stock:adjust`** — because
adjustment is a corrective inventory operation that requires stronger accountability than
ordinary add/consume traffic, and restricting it to STORE_MANAGER/ADMIN keeps that accountability
narrow. The MAINTENANCE_USER machine-linked-only consumption rule was stated explicitly in the
same approval message ("machine/machine-unit-linked CONSUMPTION") and is implemented as given.

## Consequences
No open question remains in this decision. Changing either rule is a small, localized code change
(`ROLE_PERMISSIONS` or `assertRoleCanPerformMovement`) plus a test update — not architecturally
blocking, but out of scope unless re-approved.

---

# Decision: Stock movement model (ADD / CONSUME / ADJUSTMENT)

Status: APPROVED

## Decision
`StockMovement.direction` is `ADD | CONSUME | ADJUSTMENT`. `quantity` is a magnitude (always > 0)
for ADD/CONSUME, and a signed delta (positive or negative, never zero) for ADJUSTMENT.
ADJUSTMENT requires a non-empty `reason`. The "stock must never go negative" invariant applies
uniformly to all three directions, enforced both in the domain layer
(`src/domain/stock/movementRules.ts`) and atomically in the database (see "Concurrency control"
below).

## Rationale
Directly implements the user's instruction I: Product Edit must not change stock; adjustments
need a captured reason for auditability. Applying the non-negative floor to ADJUSTMENT too (not
just ADD/CONSUME) was not explicitly stated by the user, but follows from the same physical
invariant the reference always enforced for add/consume — a corrective adjustment that would
create negative physical stock is not a business scenario, and unifying the rule avoids a
special-cased third code path.

## Consequences
An adjustment that would take stock below zero is rejected with `InsufficientStockError`, exactly
like an over-large consume. If a genuine business need for a different floor ever arises, it is a
change to `src/application/stock/recordStockMovement.ts`, not a schema change.

---

# Decision: Product Edit does not change stock

Status: APPROVED

## Decision
Nothing in the codebase updates `InventoryItem.stock` except the conditional atomic `UPDATE`
inside `recordStockMovement` (`src/application/stock/recordStockMovement.ts`). This resolves the
reference-vs-CLAUDE.md conflict identified during reconnaissance (docs/BUSINESS_RULES.md §3):
the reference let the Edit-item modal silently change stock with no movement record.

## Rationale
Directly instructed (section I): "Product Edit must NOT directly modify stock quantity... Stock
In changes stock through a movement. Consumption changes stock through a movement. Adjustment
changes stock through an explicit adjustment movement."

## Consequences
A future `updateInventoryItem` use case (not yet built — catalog CRUD screens are out of this
task's scope, see docs/MVP_SCOPE.md) must not accept `stock` as an updatable field. `threshold`,
`price`, `name`, `rack`, etc. remain ordinary editable master data.

---

# Decision: Authenticated user is the authoritative audit identity

Status: APPROVED

## Decision
`StockMovement.performedByUserId` is a required, non-null foreign key to `User`. The reference's
free-text "Employee ID" is preserved only as `StockMovement.employeeLabel`, an optional string
that is never read for authorization or audit purposes — display-only.

## Rationale
Directly instructed (section G): "The authenticated user is the authoritative identity... Do NOT
allow arbitrary free-text employee IDs to determine audit ownership... it must not replace
authenticated identity."

## Consequences
Every call to `recordStockMovement`/`createInventoryItem` requires a real `User.id`, enforced by
the FK (`onDelete: Restrict` — a user with movement history cannot be hard-deleted, only
deactivated via `isActive`). No employee/HR subsystem was built, per the same instruction.

## OPEN_QUESTION — explicitly DEFERRED, not to be redesigned around
"Shift in-charge" (`ShiftInchargeEntry.inchargeId`) was left as free text, intentionally
decoupled from `User` — the user's instructions addressed "Employee ID" specifically, not the
shift roster. Whether shift in-charge should also become a `User` reference is undecided. The
user has since confirmed explicitly: this relationship **remains OPEN_QUESTION and is DEFERRED
for now**, and the shift model must not be redesigned on account of it. The current model
(free-text `inchargeId`, captured as an immutable snapshot on each `StockMovement` — see
`docs/DOMAIN.md` §6-7) stands as-is until this is revisited.

---

# Decision: Identifiers — DB-generated, DB-safe

Status: APPROVED

## Decision
All primary keys are DB-generated UUIDs (`@default(uuid())`). Human-facing codes
(`Department.code`, `Machine.code`) are separate unique columns, generated by
`src/domain/catalog/codeGeneration.ts`. Product SKU/barcode numeric suffixes come from a
dedicated Postgres sequence (`product_code_seq`, created in
`prisma/migrations/20260814142012_add_product_code_sequence`), not a client-held counter.

## Rationale
Directly instructed (section J): "Do not use client-side timestamps or in-memory counters as
production identity. Use database-backed identifiers and uniqueness constraints."

## Consequences
SKU/barcode generation is concurrency-safe (`nextval()` is atomic in Postgres) and survives
restarts, unlike the reference's `Date.now()`/incrementing-variable scheme
(docs/BUSINESS_RULES.md §5). Verified by
`src/application/catalog/createInventoryItem.test.ts` ("never generates the same SKU or barcode
twice").

---

# Decision: Concurrency control for stock updates

Status: APPROVED

## Decision
Balance changes use a single conditional `UPDATE ... SET stock = stock + $delta WHERE id = $id
AND stock + $delta >= 0 RETURNING stock`, executed inside a Prisma interactive transaction that
also writes the `StockMovement` row. Zero rows returned ⇒ `InsufficientStockError`, transaction
rolls back, no movement row is written.

## Rationale
Instructed (section H) to "consider concurrent stock updates and use the appropriate
PostgreSQL/database transaction and concurrency mechanisms." A conditional `UPDATE` re-evaluates
the guard against the row's currently-committed value at write time under Postgres's normal
read-committed MVCC semantics, so two concurrent movements against the same item cannot both
succeed past the available stock — without needing explicit `SELECT ... FOR UPDATE` locking or
an application-level retry loop.

## Consequences
Verified by an integration test that fires two concurrent CONSUME calls for more stock than
exists combined: exactly one succeeds, exactly one movement row is written, and the final balance
is correct (`src/application/stock/recordStockMovement.test.ts`).

---

# Decision: Database and ORM — PostgreSQL + Prisma 7

Status: APPROVED

## Decision
PostgreSQL (already available locally) with Prisma 7 (`prisma-client` generator, output to
`src/generated/prisma`) and the `@prisma/adapter-pg` driver adapter, which Prisma 7 requires for
runtime client construction (schema-level `datasource.url` is no longer supported in this major
version).

## Rationale
Delegated by the user: "select the simplest mature option compatible with PostgreSQL and the
application stack" (section L). Prisma is a mature, well-supported ORM with first-class migration
tooling, satisfying CLAUDE.md's "prefer stable, well-supported libraries."

## Consequences
`prisma.config.ts` holds the Migrate-time connection config; `src/infrastructure/db/prismaClient.ts`
constructs the runtime client with an explicit `PrismaPg` adapter. This is a newer API shape than
Prisma 5/6 — noted here so a future contributor isn't confused by the absence of `datasource.url`
in `schema.prisma`.

One unrequested side effect was reverted: `prisma init` (v7) auto-installed "AI agent skill" docs
into `.claude/skills/`, `.windsurf/skills/`, and `.agents/skills/`, plus `skills-lock.json`. These
were removed immediately — not something requested, and out of place for a database-schema task.

---

# Decision: Authentication mechanism — hand-rolled session, not NextAuth/Auth.js

Status: APPROVED

## Decision
Credentials-based login: `bcryptjs` for password hashing, a `jose`-signed JWT stored in an
httpOnly cookie for the session, verified server-side per request
(`src/infrastructure/auth/{password,session,currentUser}.ts`). No third-party auth framework.

## Rationale
ARCHITECTURE.md left the specific library open, and the user delegated "use the authentication
approach recommended in ARCHITECTURE.md, provided it is simple." At the time of implementation,
`next-auth` (Auth.js) v5 — the version compatible with the Next.js App Router — has never had a
stable release (latest: `5.0.0-beta.32`, checked against the npm registry during implementation).
Depending on a long-running beta for foundational security infrastructure conflicts with CLAUDE.md
§3 ("prefer stable, well-supported libraries"). A minimal hand-rolled session is small enough to
fully own, test, and reason about, and keeps the dependency surface for something this sensitive
under our control.

## Consequences
The application/domain layers depend only on `{userId, role, email}` — never on how the session
was established — so swapping in Auth.js (once stable) or an SSO provider later does not require
touching `src/application/**` or `src/domain/**`, satisfying the user's requirement that the
architecture "allow these to be added later without requiring a fundamental redesign." No SSO,
OAuth, LDAP, or MFA was built, per explicit instruction.

---

# Decision: Testing — Vitest, real Postgres for integration tests

Status: APPROVED

## Decision
Vitest for both pure unit tests (domain layer, no I/O) and integration tests (application layer,
against a real, isolated `stockpilot_test` Postgres database — never mocked). Integration tests
truncate relevant tables between tests (`src/test/resetDatabase.ts`) and run with
`fileParallelism: false` since they share one database.

## Rationale
Delegated choice of test runner (CLAUDE.md §11 names Playwright for E2E only, leaves
unit/integration runner open). Using a real database for the stock-transaction tests was not
optional — instruction H explicitly requires verifying "the appropriate PostgreSQL/database
transaction and concurrency mechanisms," which cannot be verified against a mock.

## Consequences
Running `npm test` requires a reachable `stockpilot_test` database (see `.env.test`). A
`globalSetup` step runs `prisma migrate deploy` against it automatically before the suite runs,
so the schema can never silently drift from `stockpilot_dev`'s.

---

# Decision: Reference dead-code and known asymmetries — not implemented, not fixed

Status: APPROVED

## Decision
Not built in this phase, per explicit instruction (section Q):
- The reference's "activity feed" (dead/unreachable in the reference itself).
- The reference's quick +/-1 stock adjustment control (also dead/unreachable in the reference).
- Any fix for the analytics current-stock/period-scoping asymmetry (docs/BUSINESS_RULES.md §10).
- Any unit-of-measure conversion system for the mixed-unit quantity aggregation
  (docs/BUSINESS_RULES.md §10).

## Rationale
The user explicitly listed these as known reference issues with an explicit resolution of
"preserve as an identified issue," not "fix now." None of them touch the database schema or the
stock-transaction foundation, so deferring them costs nothing at this stage.

## Consequences
Analytics and any activity/quick-adjust UI remain entirely unbuilt; nothing in the current schema
or domain layer forecloses building them later. Recorded again in docs/MVP_SCOPE.md under
DEFERRED.
