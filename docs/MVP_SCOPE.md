# MVP_SCOPE.md — What the Enterprise MVP Includes

Defines the boundary between "reproduce the reference workflows" and "reference behaviour that
must change or be decided before production." Tags: `REFERENCE_BEHAVIOUR`,
`PRODUCTION_REQUIREMENT`, `ASSUMPTION`, `OPEN_QUESTION`. Approved decisions live in
`docs/DECISIONS.md`; this file tracks scope, not rationale.

## 1. MUST HAVE

Minimum functionality for a coherent, usable enterprise inventory MVP. Nothing here is
speculative — each line is either a reference workflow or a CLAUDE.md-mandated foundation piece.

**Foundation (built in this phase — see docs/DECISIONS.md for how):**
- Persistent PostgreSQL database, normalized schema, migrations (`prisma/migrations/`).
- Authentication (credentials + session) and the four-role RBAC model.
- Transactional stock movements (ADD / CONSUME / ADJUSTMENT) as the sole path to changing stock,
  server-side validated, atomic, audited.
- Domain-layer business rules (stock status, movement validation, code generation, product/
  machine/machine-unit validation, shift-in-charge derivation) as tested, framework-free modules.
- Automated test infrastructure (Vitest, real-database integration tests).
- Development seed data.

**Application features (not yet built — next phases):**
- Record a stock movement (UI for the transactional use case already built).
- Browse/search/filter/sort the product catalog.
- Add/edit the product catalog (edit excludes stock — see `docs/DECISIONS.md`).
- Maintain departments, machine models, machine units (add; department delete-if-unused).
- Shift in-charge log (record + derive "current").
- Low-stock alerts, stock/transaction history views.
- Role-appropriate UI (hide/disable actions the current user's role cannot perform — enforced
  server-side regardless of what the UI shows).

## 2. SHOULD HAVE

Valuable, not required for a coherent first release; build after MUST HAVE is solid.

- Analytics page (period/measure KPIs, consumption comparison chart, breakdowns) — see the
  asymmetry and mixed-unit caveats in `BUSINESS_RULES.md` §10, preserved as identified issues.
- Product duplicate action (reference behaviour; low complexity once add/edit exist).

## 3. DEFERRED

Recorded so they aren't re-litigated or accidentally built, not because they're bad ideas.

- Reference "activity feed" and quick +/-1 stock adjuster (dead in the reference itself; see
  `docs/DECISIONS.md` "Reference dead-code and known asymmetries").
- Historical/point-in-time stock balance queries (would let analytics' current-stock breakdown
  become period-scoped — requires deriving balances from the movement ledger).
- Unit-of-measure conversion for cross-unit quantity aggregation.
- Warranty-expiry alerting (the field is captured; no alerting was requested).
- Machine/machine-unit name uniqueness enforcement (reference doesn't enforce it either).
- Tying "shift in-charge" to the `User`/auth model (currently free text — see `docs/DECISIONS.md`
  "Audit identity" OPEN_QUESTION).
- Per-user permission overrides, multi-role users, approval workflows, notifications, exports,
  barcode-scanner hardware integration, supplier/purchase-order management, multi-warehouse/
  multi-tenant support.
- Microservices, Kubernetes, event sourcing, CQRS, workflow engines, AI infrastructure, or any
  architecture with more layers than UI → application → domain → persistence (see
  `ARCHITECTURE.md`) — explicitly excluded by the user, not merely deprioritized.

## 4. Roles — APPROVED

Four roles: `ADMIN`, `STORE_MANAGER`, `STORE_OPERATOR`, `MAINTENANCE_USER`. Full permission matrix
approved and finalized — see `docs/DECISIONS.md` "MVP roles" and "RBAC permission model." No open
question remains in the role model itself.

## 5. Remaining open questions

Resolved since the previous version of this document: untracked stock edits, roles, employee/
audit identity, and STORE_OPERATOR's adjustment permission (now firmly **no** — see
`docs/DECISIONS.md` "RBAC permission model"). Still open:

1. **Shift in-charge vs. User** (`docs/DECISIONS.md` "Audit identity" OPEN_QUESTION) — explicitly
   DEFERRED by the user; do not redesign the shift model around it.
2. **Dead code disposition** (`BUSINESS_RULES.md` §12) — resolved to "not built," see §3 DEFERRED
   above; only open if that decision is revisited.
3. **Analytics period asymmetry** (`BUSINESS_RULES.md` §10) — deferred to the analytics phase.
4. **Mixed-unit quantity aggregation** (`BUSINESS_RULES.md` §10) — deferred to the analytics phase.
5. **Uniqueness rules for machine/unit names** (`DOMAIN.md` §3-4) — reference behaviour preserved
   (not enforced) until a decision is made.
6. **Warranty tracking** (`DOMAIN.md` §3) — captured, not alerted on; see §3 DEFERRED.
7. **Threshold validation mismatch** (`BUSINESS_RULES.md` §11) — resolved for the foundation:
   `threshold >= 0` is enforced (the reference's actually-executed JS rule), not the HTML's
   unenforced `min=1`. Revisit if the business wants a stricter floor.

## 6. Explicitly NOT in MVP

Microservices, Kubernetes, event sourcing, CQRS, workflow engines, AI infrastructure, or any
architecture with more layers than: UI → application/use-cases → domain → persistence. See
`ARCHITECTURE.md`.

Also not implied by the reference and therefore not assumed in scope unless requested:
barcode-scanner hardware integration, supplier/purchase-order management, budget/approval
workflows, reporting export (CSV/PDF), multi-warehouse/multi-tenant support, notifications/email,
month-over-month trend calculations (the reference's "+4.7%" figure was decorative — do not
implement a fake version, either compute it for real or drop it).

## 7. Definition of done for MVP

Per CLAUDE.md §13: every MUST HAVE workflow in §1 works end-to-end against a real database with
server-side validation and authorization; every stock-changing path is transactional and produces
an audit record; the remaining open questions in §5 have been either resolved or explicitly
accepted as deferred (not silently dropped); tests cover stock add/consume/adjustment,
negative-stock prevention, inventory calculations, validation, and permissions;
typecheck/lint/tests pass.

## 8. Foundation status (this task)

Built and verified: database schema + migrations, domain layer, `recordStockMovement` and
`createInventoryItem` use cases, auth (login/logout/me) foundation, RBAC enforcement, test suite,
dev seed data. Not built: any UI, the remaining application-layer use cases (edit item, add
department/machine/machine-unit, shift log), analytics. See the completion report for this task
for full verification detail.
