# StockPilot MVP — Development Rules

## 1. Project Goal

Build a simple, production-quality MVP for an enterprise MRO Inventory Management
application based on the supplied reference HTML.

Priorities, in order:

1. Correct business behaviour
2. Reliable inventory transactions
3. Functional MVP workflows
4. Maintainable architecture
5. Reference UI fidelity
6. Visual polish

Do not sacrifice correctness for visual similarity.

---

## 2. Source of Truth

The reference HTML is the primary source of truth for:

- Initial UI
- Terminology
- User workflows
- Existing behaviour
- Existing business calculations
- Initial/demo data

Treat existing JavaScript behaviour as a behavioural specification,
not merely as UI implementation.

Project documentation:

- `docs/PRODUCT.md`
- `docs/DOMAIN.md`
- `docs/BUSINESS_RULES.md`
- `docs/UI_REFERENCE.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`

When documentation conflicts with the reference implementation:

1. Do not silently choose one.
2. Identify the conflict.
3. State the decision required.
4. Preserve existing behaviour until explicitly changed.

Do not invent business requirements.

---

## 3. Technology

- Next.js
- TypeScript
- Use the existing project stack where already established.
- Prefer stable, well-supported libraries.
- Do not upgrade dependencies merely because newer versions exist.
- Introduce a dependency only when it materially simplifies the implementation.

Keep the architecture as simple as possible.

Avoid premature abstraction, microservices, unnecessary infrastructure,
and unnecessary design patterns.

---

## 4. Core Architecture Rules

Keep these concerns separate:

- UI / presentation
- Application logic
- Domain/business logic
- Persistence/database access

Business logic must not live inside UI components.

Inventory operations must be implemented as domain/application operations,
not direct UI state mutations.

Stock is a transactional domain.

Every stock-changing operation must:

1. Validate the request.
2. Verify sufficient stock where applicable.
3. Record a stock movement.
4. Update the inventory balance atomically.
5. Record the relevant audit information.

Never implement stock changes as an untracked direct quantity mutation.

Database changes require migrations.

---

## 5. MVP Scope

Implement only functionality explicitly required by:

- `docs/MVP_SCOPE.md`
- the reference application
- an explicit user instruction

Do not add:

- speculative features
- unnecessary enterprise abstractions
- future integrations
- unnecessary dashboards
- unnecessary notifications
- unnecessary infrastructure

If a potentially useful feature is discovered, do not implement it automatically.
Record it as a possible future improvement and continue with the requested scope.

---

## 6. Reference Behaviour vs Production Behaviour

When converting prototype behaviour:

- Preserve behaviour where it is clearly intentional.
- Identify hardcoded/demo behaviour.
- Identify assumptions and approximations.
- Do not silently convert a prototype assumption into a production business rule.

When uncertain, label the issue as:

`REFERENCE_BEHAVIOUR`
`PRODUCTION_REQUIREMENT`
`ASSUMPTION`
`OPEN_QUESTION`

Do not resolve business ambiguity by guessing.

---

## 7. Development Strategy

Work incrementally in small, coherent vertical slices.

For each feature:

1. Inspect only the relevant code and documentation.
2. Identify dependencies and affected areas.
3. Create a short implementation plan.
4. Implement the smallest complete solution.
5. Test the changed behaviour.
6. Run typecheck.
7. Run lint when relevant.
8. Review for regressions.
9. Report the result concisely.

Do not rewrite unrelated code.

Do not perform opportunistic refactoring.

Do not change working code merely for stylistic reasons.

---

## 8. Planning Rules

For major architectural or cross-cutting changes:

- Plan first.
- Identify affected files/modules.
- Identify risks.
- Wait for approval before implementation if the change is substantial.

For small, well-defined tasks:

- Do not waste a separate planning turn.
- Inspect the relevant code and implement directly.

Do not repeatedly re-plan the entire project.

The existing project plan and documentation should be reused.

---

## 9. Context and Token Efficiency

Optimize for efficient use of model context.

- Read only files relevant to the current task.
- Do not repeatedly inspect unrelated files.
- Prefer project documentation over re-analyzing the reference HTML.
- Do not reproduce large files or code blocks unnecessarily.
- Do not explain obvious implementation details at length.
- Keep implementation plans concise.
- Keep final reports concise.
- Reuse existing utilities and components where appropriate.
- Avoid unnecessary refactoring.

Do not spend model effort solving problems that are outside the current task.

---

## 10. Coding Standards

- TypeScript with strict typing where practical.
- Clear, idiomatic code.
- Small functions with clear responsibilities.
- Meaningful names.
- Avoid unnecessary comments.
- Comments should explain non-obvious business logic, not restate code.
- No emojis in code, documentation, commits, or generated UI copy unless explicitly requested.
- Do not add abstractions until they solve a demonstrated problem.

Prefer boring, understandable code over clever code.

---

## 11. Testing

Business-critical logic must have automated tests.

Prioritize tests for:

- Stock additions
- Stock consumption
- Stock adjustments
- Negative-stock prevention
- Inventory calculations
- Validation
- Permissions
- Database constraints
- Important business rules

For UI changes, use appropriate component/integration tests where valuable.

Use Playwright or equivalent for critical end-to-end workflows.

Do not run expensive full-suite testing after every trivial change.

Use proportional verification:

- Small UI change → relevant checks
- Business logic change → unit tests + typecheck
- API/database change → relevant integration tests
- Cross-module/critical workflow → integration/E2E tests
- Pre-release → full test suite + E2E suite

Never declare a feature complete if relevant tests are failing.

---

## 12. Data and Security

Never use hardcoded in-memory state as the production source of truth.

Demo/seed data is acceptable for development.

Production data must be persisted in the database.

Authorization must be enforced server-side.

Do not rely on UI controls to provide security.

Validate all externally supplied data.

Do not expose secrets, credentials, or sensitive configuration in source code.

---

## 13. Definition of Done

A feature is complete only when:

- Required functionality works.
- Existing relevant behaviour is preserved.
- Business logic is tested.
- Database changes are migrated where applicable.
- Typecheck passes.
- Relevant lint/tests pass.
- No known blocker remains.
- No unrelated functionality was unnecessarily changed.

The MVP is complete only when all items in `docs/MVP_SCOPE.md`
are implemented and the critical end-to-end workflows pass.

---

## 14. Response Format

After implementation, report only:

### Changes
- Short list of what changed.

### Verification
- Tests run
- Typecheck
- Lint if applicable

### Issues
- Blockers or known limitations only.

### Next
- One recommended next step.

Do not provide long explanations unless requested.
