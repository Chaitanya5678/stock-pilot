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

**Application features — built:**
- Login/logout, session-gated inventory page.
- Record a stock movement (Stock in / Consumption / Adjustment) with role-appropriate options,
  server-side validated, atomic, with movement/history visibility.
- Browse/search/filter the product catalog (search, department, category, status).
- Add/edit the product catalog (edit excludes stock — see `docs/DECISIONS.md`).
- Maintain departments (add, edit, delete-if-unused), machine models (add, edit), machine units
  (add, edit) — see `docs/DECISIONS.md` "Master data edit beyond reference" and "Master data
  deletion scope." Newly created/edited departments and machines are immediately selectable in
  the product form (same live read query, no caching).
- Role-appropriate UI (catalog and master-data management controls hidden for roles without
  `catalog:manage`, enforced server-side regardless of what the UI shows).
- Shift in-charge log (record + derive "current") — a sidebar card on the Inventory page, per
  `docs/UI_REFERENCE.md` §2. Recording requires `catalog:manage`; viewing the current in-charge
  and recent history is visible to all roles. See `docs/DECISIONS.md` for the three decisions
  from this phase (no audit-actor column, reuse of `deriveInchargeAt`, permission reuse).
- Low-stock alerts sidebar (read-only) — the third and final reference sidebar card on the
  Inventory page, reusing the existing `stockStatus` domain rule (no second "low stock"
  definition) and viewable by all roles (`catalog:view`). Excludes the reference's "usage rate"
  figure, which `docs/BUSINESS_RULES.md` §10 already categorizes as an Analytics computation —
  out of scope for a read-only alert card per this phase's explicit instruction.

**Application features — not yet built (next phases):**
- Product delete/deactivate — see `docs/DECISIONS.md` "Product delete/deactivate" OPEN_QUESTION.

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
8. **Shift-entry timestamp tie-break** (`DOMAIN.md` §7) — undefined in the reference, given a
   deterministic-but-arbitrary resolution in `deriveInchargeAt` (later array entry wins); not
   revisited this phase.
9. **Who may record a shift in-charge entry** (`docs/DECISIONS.md` "Shift in-charge recording
   reuses catalog:manage") — restricted to ADMIN/STORE_MANAGER as the minimum-safe default,
   though the reference let anyone do it. Open whether STORE_OPERATOR should also be allowed.
10. **Product delete/deactivate** (`docs/DECISIONS.md` "Product delete/deactivate") — not built;
    the reference never supported it either, but production needs *some* answer eventually.
11. **Item department vs. its linked machine's department may diverge** (`DOMAIN.md` §5) — the
    product form auto-fills department on machine selection but still allows changing it
    afterward, preserving the reference's exact behaviour; unresolved whether that divergence
    should be blocked.

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

## 8. Foundation status

Built and verified, across six completed phases (foundation → stock movement vertical slice →
product catalog management → master data management → shift in-charge log → low-stock alerts):
database schema + migrations, domain layer, `recordStockMovement`,
`createInventoryItem`/`updateInventoryItem`, department/machine/machine-unit create+edit(+delete
for department), `recordShiftEntry`/`listShiftEntries`/`getCurrentShiftIncharge`,
`listLowStockAlerts` use cases, auth (login/logout/me), RBAC enforcement, full login → inventory
→ movement/catalog/machines/shift/alerts UI, test suite (unit + integration + Playwright E2E),
dev seed data. The Inventory page's sidebar (per `docs/UI_REFERENCE.md` §2) is now complete: all
three reference cards (Low stock alerts, Stock history, Shift in-charge log) are built. Not
built: analytics, product delete/deactivate. See each phase's completion report for full
verification detail.
