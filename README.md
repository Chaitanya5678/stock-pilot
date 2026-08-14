# StockPilot

StockPilot is a web-based MRO (Maintenance, Repair & Operations) inventory management
application. It tracks spare parts, tools, and consumables used to maintain equipment across
departments, records every stock movement as an auditable transaction, and provides role-based
access control for store and maintenance staff.

This repository contains the **MVP (Minimum Viable Product)** implementation, built on
Next.js, TypeScript, PostgreSQL, and Prisma.

---

## Table of contents

- [MVP status](#mvp-status)
- [Features included in the MVP](#features-included-in-the-mvp)
- [Technology stack](#technology-stack)
- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Cloning the repository](#cloning-the-repository)
- [Operating-system-specific setup](#operating-system-specific-setup)
- [Environment configuration](#environment-configuration)
- [Database setup](#database-setup)
- [Seeded users / test accounts](#seeded-users--test-accounts)
- [How to test the MVP manually](#how-to-test-the-mvp-manually)
- [Automated testing](#automated-testing)
- [Project structure](#project-structure)
- [Security / data integrity notes](#security--data-integrity-notes)
- [MVP limitations / deferred features](#mvp-limitations--deferred-features)
- [Troubleshooting](#troubleshooting)
- [Development workflow](#development-workflow)

---

## MVP status

The MVP has been implemented across six phases (foundation, stock movements, product catalog,
master data, shift in-charge log, low-stock alerts), followed by a dedicated hardening pass and
a final acceptance review. As of the latest review:

- Overall verdict: **READY WITH MINOR RISKS** (no blockers)
- Automated tests: **192/192 Vitest tests passing**, **9/9 Playwright E2E tests passing**
- `typecheck` and `lint`: clean
- PostgreSQL schema and migrations: up to date, no drift
- Core workflows (auth, inventory, stock movements, product catalog, master data, shift log,
  low-stock alerts) are implemented and server-side authorized

This is an MVP, not a finished commercial product. It has **not** been described as
"production-ready" or "enterprise-ready" by its own project documentation, and a number of
scope decisions and open questions are intentionally deferred — see
[MVP limitations / deferred features](#mvp-limitations--deferred-features). The authoritative,
detailed record of what was built, why, and what remains open lives in [`docs/`](docs), in
particular [`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md) and [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Features included in the MVP

### Authentication and access control
- Email/password login and logout, using a signed, httpOnly session cookie.
- Four fixed roles: `ADMIN`, `STORE_MANAGER`, `STORE_OPERATOR`, `MAINTENANCE_USER` (see
  [Seeded users](#seeded-users--test-accounts) for the exact permission matrix).
- Every mutating operation is authorized **server-side**, inside the application layer — the UI
  hides controls a role can't use, but that is a usability convenience, not the security boundary.

### Inventory / product catalog
- Browse, search, and filter the product catalog (by name/SKU/barcode, department, category,
  status).
- Create and edit products (name, department, machine, category, criticality, rack, unit of
  measure, threshold, price).
- **Editing a product never changes its stock quantity.** Opening stock is set once, at creation.
  All subsequent stock changes go through a stock movement (see below). This is an explicit,
  documented production decision — see [`docs/DECISIONS.md`](docs/DECISIONS.md) ("Product Edit
  does not change stock").
- SKU and barcode are generated automatically and are never edited by hand.

### Stock movements
- Three movement types: **Stock in** (add), **Consumption** (consume), and **Adjustment**
  (signed correction with a required reason).
- Every stock change is transactional: the balance update and the movement record are written
  together, atomically, or not at all.
- Stock can never go negative, for any movement type, including adjustments.
- Movement history is visible on the Inventory page (most recent movements, with detail).
- Which movement types a user can perform depends on their role (see the RBAC table below).

### Master data
- **Departments**: create, edit, and delete. Deletion is blocked (with a clear error) if any
  machine or inventory item still references the department — nothing is ever cascade-deleted.
- **Machine models**: create and edit. There is no delete for machine models.
- **Machine units** (physical instances of a machine model): create and edit. There is no delete
  for machine units.
- Master-data changes (create/edit/delete) never modify any product's stock quantity and never
  create a stock movement record.

### Shift in-charge log
- Record who is responsible for a given time window (an in-charge ID and an effective
  timestamp).
- The "current" shift in-charge is derived server-side from the recorded history, not
  recalculated in the browser.
- Viewing the current in-charge and recent history is available to every role; recording a new
  entry requires the same permission as catalog/master-data management.

### Low-stock alerts
- A read-only sidebar card on the Inventory page listing every item that is low-stock or
  out-of-stock, using the exact same stock-status rule the rest of the application uses (no
  second definition of "low stock").
- Selecting an alert feeds the existing stock-movement lookup, the same mechanism used elsewhere
  in the inventory table.

### Persistence and testing
- All data is persisted in PostgreSQL via Prisma, with foreign-key constraints that protect
  historical data (see [Security / data integrity notes](#security--data-integrity-notes)).
- Automated Vitest unit/integration tests (against a real database) and Playwright end-to-end
  tests cover the workflows above.

---

## Technology stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) | UI + Server Actions + API routes in one app |
| UI | [React](https://react.dev) 19 | |
| Language | [TypeScript](https://www.typescriptlang.org) 5 | |
| Database | [PostgreSQL](https://www.postgresql.org) | via `pg` and `@prisma/adapter-pg` |
| ORM / migrations | [Prisma](https://www.prisma.io) 7 | schema in `prisma/schema.prisma` |
| Validation | [Zod](https://zod.dev) | Server Action input validation |
| Authentication | [`jose`](https://github.com/panva/jose) + [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) | hand-rolled session (see `docs/DECISIONS.md`), not a third-party auth framework |
| Unit/integration tests | [Vitest](https://vitest.dev) | runs against a real PostgreSQL test database |
| End-to-end tests | [Playwright](https://playwright.dev) | Chromium only |
| Linting | [ESLint](https://eslint.org) (`eslint-config-next`) | |
| Dev script runner | [`tsx`](https://github.com/privatenumber/tsx) | used to run the seed script |

No other runtime dependencies are used. There is no separate frontend framework, state-management
library, CSS framework, or ORM other than Prisma.

---

## Quick start

This is the condensed path from a fresh clone to a running app. It assumes the
[prerequisites](#prerequisites) are already installed. If anything fails, jump to
[Troubleshooting](#troubleshooting) or the detailed [OS-specific setup](#operating-system-specific-setup).

```bash
# 1. Clone and enter the repository
git clone <YOUR-REPOSITORY-URL>
cd stock-pilot

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
# then edit .env: set DATABASE_URL to a real PostgreSQL connection string,
# and set SESSION_SECRET (see "Environment configuration" below)

# 4. Make sure PostgreSQL is running and the database in DATABASE_URL exists
#    (see "Database setup" below if you haven't created it yet)

# 5. Apply database migrations
npm run db:migrate

# 6. Seed development data (departments, machines, products, movement history, 4 dev users)
npm run db:seed

# 7. Start the development server
npm run dev
```

Open **http://localhost:3000** in a browser. You should be redirected to `/login`. Sign in with
one of the [seeded accounts](#seeded-users--test-accounts), for example
`admin@stockpilot.local` / `DevPassword123!`.

> The app runs on port **3000** by default (Next.js's default dev port; nothing in this repo
> overrides it). If something else on your machine is already using port 3000, see
> [Troubleshooting](#troubleshooting).

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Git** | Any recent version, to clone the repository. |
| **Node.js** | No specific version is pinned in this repository (no `engines` field, no `.nvmrc`). `package.json`'s `@types/node` targets the Node 20 API surface, and this project was developed and verified with **Node.js v24**. Node.js 20 LTS or newer is recommended. |
| **npm** | Ships with Node.js. This project uses `npm` (a `package-lock.json` is committed); it was verified with npm 11. |
| **PostgreSQL** | No specific version is pinned or enforced by the repository. Developed and verified against **PostgreSQL 15**. PostgreSQL must be **installed and running locally** (or otherwise reachable) before you configure `DATABASE_URL`. |
| **A modern browser** | To use the app and to run Playwright (which additionally downloads its own bundled Chromium — see [Automated testing](#automated-testing)). |

You do not need Docker, Redis, or any other infrastructure — this is a single Next.js app
talking to a single PostgreSQL database.

---

## Cloning the repository

```bash
git clone <YOUR-REPOSITORY-URL>
cd stock-pilot
```

Replace `<YOUR-REPOSITORY-URL>` with the actual Git remote URL for this project (for example, an
HTTPS or SSH GitHub URL). `stock-pilot` is this project's directory name; adjust the `cd` if you
clone it under a different local folder name.

---

## Operating-system-specific setup

Pick the section for your OS. All three end at the same place: a running PostgreSQL server and a
configured `.env` file, after which the [Quick start](#quick-start) commands are identical
everywhere.

### macOS

1. **Install Homebrew** (skip if you already have it):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. **Install Git and Node.js**:
   ```bash
   brew install git node
   node --version
   ```
3. **Install PostgreSQL**:
   ```bash
   brew install postgresql@15
   ```
4. **Start PostgreSQL** (as a background service that survives reboots):
   ```bash
   brew services start postgresql@15
   ```
   If `psql` isn't on your `PATH` afterwards, Homebrew's install output will show the exact
   `PATH` line to add (typically for `/opt/homebrew/opt/postgresql@15/bin` on Apple Silicon, or
   `/usr/local/opt/postgresql@15/bin` on Intel) — add it to your shell profile
   (`~/.zshrc` for the default zsh shell) and open a new terminal.
5. **Verify PostgreSQL is running**:
   ```bash
   pg_isready
   ```
6. **Create the database** (Homebrew's PostgreSQL trusts local connections for your macOS user
   by default, so no password setup is required for local development):
   ```bash
   createdb stockpilot_dev
   createdb stockpilot_test   # only needed if you plan to run the automated test suite
   ```
7. **Configure `.env`** — see [Environment configuration](#environment-configuration). With the
   defaults above, `DATABASE_URL` will look like:
   ```
   DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/stockpilot_dev?schema=public"
   ```
8. Continue with the [Quick start](#quick-start) steps from `npm install` onward.

### Linux (Ubuntu / Debian)

These commands target Ubuntu/Debian and `apt`. Other distributions (Fedora, Arch, etc.) use
different package managers — the overall steps (install PostgreSQL, start the service, create a
database) are the same, but the exact commands differ.

1. **Install Git**:
   ```bash
   sudo apt update
   sudo apt install -y git
   ```
2. **Install Node.js** (via NodeSource, to get a current version rather than the older one in
   the default Ubuntu/Debian repositories):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version
   ```
3. **Install PostgreSQL**:
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   ```
4. **Start and enable PostgreSQL**:
   ```bash
   sudo systemctl enable --now postgresql
   sudo systemctl status postgresql
   ```
5. **Create a database user and databases.** Ubuntu/Debian's PostgreSQL defaults to peer
   authentication for the `postgres` system user; the simplest reliable path is to create a
   Postgres role matching your own Linux username so you can connect without a password:
   ```bash
   sudo -u postgres createuser --superuser "$(whoami)"
   createdb stockpilot_dev
   createdb stockpilot_test   # only needed if you plan to run the automated test suite
   ```
   (If `createdb` still asks for a password or fails with a permission error, connect explicitly
   as the `postgres` user instead: `sudo -u postgres createdb stockpilot_dev`, and adjust
   `DATABASE_URL` accordingly.)
6. **Verify PostgreSQL is reachable**:
   ```bash
   pg_isready
   psql -d stockpilot_dev -c "select 1;"
   ```
7. **Configure `.env`** — see [Environment configuration](#environment-configuration):
   ```
   DATABASE_URL="postgresql://YOUR_LINUX_USERNAME@localhost:5432/stockpilot_dev?schema=public"
   ```
8. Continue with the [Quick start](#quick-start) steps from `npm install` onward.

### Windows

These instructions use **PowerShell** (not Git Bash/WSL) and the standard installers for each
tool. Open PowerShell for all commands below.

1. **Install Git**: download and run the installer from
   [git-scm.com/download/win](https://git-scm.com/download/win) (default options are fine).
   Verify in a new PowerShell window:
   ```powershell
   git --version
   ```
2. **Install Node.js**: download the LTS installer from
   [nodejs.org](https://nodejs.org) and run it (default options are fine). Verify in a new
   PowerShell window:
   ```powershell
   node --version
   npm --version
   ```
3. **Install PostgreSQL**: download the installer from
   [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (the
   EDB installer). During setup:
   - You will be asked to set a password for the default `postgres` superuser — **remember this
     password**, you'll need it for `DATABASE_URL`.
   - Keep the default port (`5432`) unless you have a reason to change it.
   - The installer adds PostgreSQL's `bin` directory to your `PATH` and installs **pgAdmin** (a
     GUI) and a **"SQL Shell (psql)"** shortcut in the Start Menu — you don't need to configure
     `PATH` manually.
4. **Create the database**, using the Start Menu shortcut **"SQL Shell (psql)"** (press Enter to
   accept each default prompt — server, database `postgres`, port, username `postgres` — until
   it asks for the password you set in step 3):
   ```
   CREATE DATABASE stockpilot_dev;
   CREATE DATABASE stockpilot_test;  -- only needed if you plan to run the automated test suite
   ```
   Type `\q` to exit.
5. **Clone the repository and install dependencies** (back in PowerShell):
   ```powershell
   git clone <YOUR-REPOSITORY-URL>
   cd stock-pilot
   npm install
   ```
6. **Create your environment file**:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edit `.env` in a text editor. Set `DATABASE_URL` using the `postgres` user and password from
   step 3:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/stockpilot_dev?schema=public"
   ```
   Generate `SESSION_SECRET` from the same PowerShell window (this command works identically in
   PowerShell, it just invokes Node.js):
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Paste the output as the value of `SESSION_SECRET` in `.env`.
7. **Run migrations, seed, and start the app**:
   ```powershell
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```
8. Open **http://localhost:3000** in a browser.

---

## Environment configuration

Configuration is loaded from a `.env` file at the project root (not committed — see `.gitignore`,
which ignores every `.env*` file except the checked-in `.env.example` template).

Create your local file from the template:

```bash
cp .env.example .env       # macOS / Linux
```
```powershell
Copy-Item .env.example .env   # Windows PowerShell
```

`.env.example` defines exactly two variables:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma (both the app and migrations). Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`. The password portion can be omitted for local setups that use trust/peer authentication (see the OS-specific sections above). |
| `SESSION_SECRET` | Yes | Symmetric secret used to sign and verify session tokens (see `src/infrastructure/auth/session.ts`). The application will throw an error on any authenticated request if this is unset. |

Generate a safe random value for `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This works identically on macOS, Linux, and Windows PowerShell (it just runs Node.js).

> **Never commit `.env`.** It's already excluded by `.gitignore`. Don't paste real secrets into
> issues, pull requests, or this README. The values in `.env.example` are placeholders only.

If you plan to run the automated test suite, you also need a **separate** `.env.test` file — see
[Automated testing](#automated-testing).

---

## Database setup

1. **Start PostgreSQL** and make sure it's reachable (see the [OS-specific
   setup](#operating-system-specific-setup) section for your platform).
2. **Create the database** referenced by `DATABASE_URL` if it doesn't already exist (each
   OS section above shows the exact command — `createdb stockpilot_dev` on macOS/Linux, or a
   `CREATE DATABASE` statement in `psql`/pgAdmin on Windows).
3. **Set `DATABASE_URL`** in `.env` to point at that database.
4. **Apply migrations**:
   ```bash
   npm run db:migrate
   ```
   This runs `prisma migrate dev`, which applies every migration in `prisma/migrations/` to the
   database in `DATABASE_URL` (creating it in sync with `prisma/schema.prisma`). In a fresh
   database this simply creates all the tables.
5. **Seed development data**:
   ```bash
   npm run db:seed
   ```
   This runs `prisma/seed.ts` (via `tsx`), which creates:
   - 4 development user accounts (see [Seeded users](#seeded-users--test-accounts))
   - 5 departments, 4 machine models, 6 machine units
   - 7 inventory items spanning normal, low, and out-of-stock states
   - a realistic stock movement history (recorded through the real transactional
     `recordStockMovement` code path, not inserted directly)
   - a shift in-charge log with 4 historical entries

   **The seed script is safe to re-run**: it checks whether any department already exists and
   exits immediately without making changes if so. It does not reset or delete anything.

### Applying migrations vs. seeding vs. resetting

- **`npm run db:migrate`** (`prisma migrate dev`) — creates/updates the database *schema*
  (tables, columns, constraints). Safe to run repeatedly; it only applies migrations that
  haven't been applied yet.
- **`npm run db:migrate:deploy`** (`prisma migrate deploy`) — applies existing migrations
  without prompting or generating new ones. This is what the automated test suite runs
  automatically against the test database (see below); you generally won't need to run it
  yourself for local development.
- **`npm run db:seed`** — inserts *data* into an already-migrated database. Idempotent (see
  above) — it will not duplicate data on a second run.
- **Resetting the database**: this repository does not define a scripted "reset" command. If you
  need to start over during local development, you are responsible for dropping and recreating
  the database yourself (e.g. `dropdb stockpilot_dev && createdb stockpilot_dev`) before
  re-running migrate and seed.
  > ⚠️ Dropping a database is destructive and irreversible. Double-check you're targeting the
  > right database name before running `dropdb`, and never run it against anything other than
  > your own local development database.

---

## Seeded users / test accounts

These accounts are created by `npm run db:seed` (`prisma/seed.ts`). They are **development-only**
credentials — every seeded user has `isSeedUser: true` in the database and a clearly fake
`@stockpilot.local` email address. Do not reuse this password anywhere real.

| Role | Email | Password | Display name |
|---|---|---|---|
| `ADMIN` | `admin@stockpilot.local` | `DevPassword123!` | Dev Admin |
| `STORE_MANAGER` | `manager@stockpilot.local` | `DevPassword123!` | Dev Store Manager |
| `STORE_OPERATOR` | `operator@stockpilot.local` | `DevPassword123!` | Dev Store Operator |
| `MAINTENANCE_USER` | `maintenance@stockpilot.local` | `DevPassword123!` | Dev Maintenance User |

### Role capabilities

| Capability | ADMIN | STORE_MANAGER | STORE_OPERATOR | MAINTENANCE_USER |
|---|:---:|:---:|:---:|:---:|
| View inventory, history, alerts, current shift in-charge | ✅ | ✅ | ✅ | ✅ |
| Stock In | ✅ | ✅ | ✅ | ❌ |
| Consumption | ✅ | ✅ | ✅ | ✅ (machine-linked items only) |
| Adjustment | ✅ | ✅ | ❌ | ❌ |
| Create/edit products, departments, machines, machine units | ✅ | ✅ | ❌ | ❌ |
| Delete a department (only if unused) | ✅ | ✅ | ❌ | ❌ |
| Record a shift in-charge entry | ✅ | ✅ | ❌ | ❌ |

`MAINTENANCE_USER` can only consume stock against items linked to a machine (not
store-only/unlinked items) — this reflects the role's intended scope (maintenance staff working
against specific equipment), enforced server-side, not just hidden in the UI.

Every rule above is enforced in the application layer, independent of what the UI shows — a
request attempting an action outside these rules is rejected server-side regardless of how it's
made.

---

## How to test the MVP manually

A practical checklist to exercise the MVP end to end in a browser, using the seeded accounts
above. None of this requires reading the source code.

### Authentication
- [ ] Go to `http://localhost:3000` while logged out — you should be redirected to `/login`.
- [ ] Log in with an invalid email/password — you should see an error message, not a crash.
- [ ] Log in with a valid seeded account — you should land on the Inventory page.
- [ ] Click **Sign out** — you should be returned to the login page, and revisiting `/inventory`
      directly should redirect back to `/login`.

### Inventory browsing
- [ ] On the Inventory page, use the search box to filter by product name, SKU, or barcode.
- [ ] Filter by department, category, and status (in stock / low stock / out of stock).
- [ ] Confirm the stock quantity and status badge shown for a few items look correct.

### Stock movements (log in as `operator@stockpilot.local` or `manager@stockpilot.local`)
- [ ] Look up a product by SKU or barcode (or click **Use** on a table row) in the Stock movement
      panel.
- [ ] Record a **Stock in** movement — confirm the balance and movement history update.
- [ ] Record a **Consumption** movement against a machine-linked item — confirm you're required
      to pick a machine unit.
- [ ] Try to consume more than the current stock — confirm you get an "insufficient stock"
      error, and stock/history are unchanged.
- [ ] Log in as `manager@stockpilot.local` (or `admin@stockpilot.local`) specifically to test
      **Adjustment** — a reason is required; try submitting without one and confirm it's
      rejected.
- [ ] Log in as `operator@stockpilot.local` and confirm **Adjustment is not offered** as a
      movement type at all.
- [ ] Confirm each recorded movement appears in the "Stock history" list with the correct type,
      quantity, and balance.

### Product catalog (log in as `manager@stockpilot.local` or `admin@stockpilot.local`)
- [ ] Click **Add product**, fill in the form, and create a new product — confirm it appears in
      the inventory table with an auto-generated SKU/barcode.
- [ ] Edit an existing product's name/category/threshold/price — confirm the change is saved.
- [ ] **Confirm the product's stock quantity is unchanged after editing it** — the edit form does
      not expose a stock field at all.
- [ ] Log in as `operator@stockpilot.local` or `maintenance@stockpilot.local` and confirm neither
      **Add product** nor **Edit** is available.
- [ ] *Duplicate SKU/barcode*: SKU and barcode are always generated automatically — there is no
      form field to type one in, so this isn't something you can trigger manually through the
      UI. Uniqueness is enforced by a database constraint and covered by automated tests (see
      `src/application/catalog/createInventoryItem.test.ts`).

### Master data (log in as `manager@stockpilot.local` or `admin@stockpilot.local`, on the
Machines page)
- [ ] Create a department, then create a machine model under it, then create a machine unit
      under that machine.
- [ ] Edit the department's name and confirm existing machines/products still reference it
      correctly.
- [ ] Try to **Remove** a department that has machines or products — confirm it's blocked with a
      clear message.
- [ ] Create a brand-new, unused department and confirm **Remove** succeeds for it.
- [ ] Confirm the newly created department/machine are immediately selectable in the product
      form.
- [ ] Log in as `operator@stockpilot.local` and confirm no Add/Edit/Remove controls are visible
      on the Machines page.

### Shift in-charge
- [ ] On the Inventory page, note the "Current: ..." shift in-charge label and the recent-entries
      list.
- [ ] Log in as `manager@stockpilot.local` or `admin@stockpilot.local` and record a new shift
      entry — confirm it appears in the history and the "Current" label updates.
- [ ] Log in as `operator@stockpilot.local` or `maintenance@stockpilot.local` and confirm the
      recording form is not shown (the current in-charge and history are still visible).

### Low-stock alerts
- [ ] On the Inventory page, confirm the "Low stock alerts" card lists the seeded out-of-stock
      item ("Filter, Air, Compressor Unit 2") with "Out of stock", and the seeded low-stock items
      with their remaining quantity.
- [ ] Confirm a normal/healthy-stock item does **not** appear in this card.
- [ ] Click **Use** on an alert row and confirm it populates the Stock movement panel's lookup
      field with that product.

---

## Automated testing

Commands are taken directly from `package.json`.

### Unit and integration tests (Vitest)

```bash
npm test
```

This runs every `*.test.ts` file under `src/` — pure domain-logic unit tests plus
integration tests that run against a **real PostgreSQL database** (never mocked). It requires a
`.env.test` file (not committed, same format as `.env`) pointing at a **separate** database from
your development one:

```
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/stockpilot_test?schema=public"
SESSION_SECRET="any-random-value-for-tests"
```

> ⚠️ **Integration tests truncate every table between test cases.** `.env.test`'s `DATABASE_URL`
> must point at a dedicated test database (e.g. `stockpilot_test`, created in
> [Database setup](#database-setup)) — never your development database. Running the suite against
> the wrong database will delete your development data.

Before the suite runs, a global setup step automatically applies pending migrations to the test
database (`prisma migrate deploy`), so it can't silently drift from your schema.

```bash
npm run test:watch     # same tests, watch mode
```

### Typecheck and lint

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
```

Neither requires a database connection.

### End-to-end tests (Playwright)

```bash
npm run test:e2e
```

This runs `playwright test`, which drives a real Chromium browser against the app using the
**development** database's seed data (it logs in with the seeded accounts above). If this is
your first time running Playwright, install its browser binary first:

```bash
npx playwright install chromium
```

Playwright's config (`playwright.config.ts`) automatically starts `npm run dev` for you if the
app isn't already running (`reuseExistingServer: true` — if you already have `npm run dev`
running in another terminal, Playwright will reuse it rather than starting a second instance),
against `http://localhost:3000`. Because these tests use the dev database's seed data, running
them repeatedly is expected to leave some additional records behind (e.g. newly created test
departments/products with timestamped names) — this is by design, not a bug.

---

## Project structure

```
src/
  app/              Next.js App Router: pages (login, inventory, machines) and API routes
  components/       React components, grouped by feature (auth, inventory, catalog, machines, layout)
  application/      Use cases: the orchestration layer between the UI and the domain/database
  domain/           Pure business rules (stock status, movement validation, RBAC, code
                     generation, shift derivation) — framework-free, fully unit-testable
  infrastructure/   Framework/library-facing code with no business rules: the Prisma client,
                     password hashing, session signing/verification
  lib/              Small shared presentation helpers (formatting, error mapping)
  test/             Shared test helpers (database reset, fixtures) used by Vitest
  generated/prisma/ Prisma's generated client (not committed — regenerated by `prisma generate`)
prisma/
  schema.prisma     Database schema (source of truth for the data model)
  migrations/       Versioned SQL migrations
  seed.ts           Development seed script
e2e/                Playwright end-to-end test specs
docs/               Project documentation: product scope, domain model, business rules,
                     architecture, and the full decision log (docs/DECISIONS.md)
```

### Architectural flow

Every feature in this codebase follows the same direction of dependency:

```
UI (src/app, src/components)
   → Server Action (src/app/**/actions.ts)
      → Application / use case (src/application/**)
         → Domain rules (src/domain/**)
            → Infrastructure / Prisma (src/infrastructure/db)
               → PostgreSQL
```

Business rules live in the domain layer, never in React components or Server Actions. Server
Actions are thin: they resolve the current session, validate input, call an application-layer use
case, and map any resulting error to a safe, user-facing message. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full rationale.

---

## Security / data integrity notes

- **Authorization is enforced server-side**, inside application-layer use cases — not only in
  the UI. Every mutating Server Action re-derives the caller's role from their verified session;
  none accept a role or user ID from client input.
- **Sessions** are signed JSON Web Tokens (HMAC, via `jose`) stored in an httpOnly,
  `SameSite=Lax` cookie (additionally marked `Secure` when `NODE_ENV=production`). Passwords are
  hashed with `bcryptjs`.
- **Stock changes are transactional.** A stock movement's balance update and its audit record are
  written together inside a single database transaction; if either step fails, both are rolled
  back — a successful movement is never left half-applied.
- **Negative stock is structurally prevented**: the balance update is a single conditional SQL
  statement that re-checks the current committed balance at write time, so two concurrent
  movements against the same item can't both succeed past the available stock.
- **Foreign keys protect historical data.** Every relationship in the schema uses
  `onDelete: Restrict` — deleting a department, machine, or product that has any dependent
  records (machines, movements, etc.) is rejected by the database itself, not just by application
  logic.
- **No secrets are committed to this repository.** `.env` and `.env.test` are git-ignored; only
  the placeholder `.env.example` is tracked. Development seed accounts use an obviously fake
  password and email domain and are flagged `isSeedUser: true` in the database.
- This is an MVP-level security posture appropriate for internal/development use — it has not
  been through a dedicated third-party security review, and features like multi-factor
  authentication, session revocation, or SSO are out of scope (see below).

---

## MVP limitations / deferred features

The full, authoritative list — with rationale — lives in
[`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md) and [`docs/DECISIONS.md`](docs/DECISIONS.md). Summary:

### Explicitly deferred (not built, by design)
- **Analytics/reporting** (consumption trends, charts, dashboards) — no analytics functionality
  exists in this MVP.
- **Product delete/deactivate** — products can be created and edited, but not removed. This is a
  genuinely open product question, not an oversight (see `docs/DECISIONS.md`).
- **Notifications** (email/SMS/push) for low stock or any other event.
- Bulk import/export, supplier/purchase-order management, multi-warehouse support, and any form
  of scheduling, attendance, or payroll functionality.

### Open questions (intentionally unresolved, documented, not bugs)
- Whether `STORE_OPERATOR` should also be permitted to record shift in-charge entries.
- Whether "shift in-charge" should ever become a reference to an authenticated `User` rather than
  a free-text identifier.
- Uniqueness enforcement for machine/machine-unit names (currently not enforced).
- A few smaller documented edge cases in `docs/DECISIONS.md` and `docs/MVP_SCOPE.md`.

None of the above are hidden — they are recorded, with reasoning, in the docs referenced above,
and are intentionally left open rather than guessed at.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `npm run dev` starts, but every page errors | `.env` is missing or incomplete. Confirm `DATABASE_URL` and `SESSION_SECRET` are both set (see [Environment configuration](#environment-configuration)). |
| `Error: SESSION_SECRET is not set` | `.env` doesn't define `SESSION_SECRET`, or you're running a command from a shell/process that doesn't load `.env`. Re-check `.env` exists at the project root and is spelled correctly. |
| Prisma/connection errors like `Can't reach database server` | PostgreSQL isn't running. Check with `pg_isready` (macOS/Linux) or check the PostgreSQL service in Windows' Services app. Start it per the [OS-specific setup](#operating-system-specific-setup) instructions. |
| `database "stockpilot_dev" does not exist` | You haven't created the database yet. See [Database setup](#database-setup) — `createdb stockpilot_dev` (macOS/Linux) or `CREATE DATABASE stockpilot_dev;` in `psql`/pgAdmin (Windows). |
| `npm run db:migrate` fails with an authentication/permission error | `DATABASE_URL`'s username/password/host don't match your actual PostgreSQL setup. Double-check the connection string against how you connect with `psql` manually. |
| `npm run db:seed` logs "Seed skipped: departments already exist" | This is expected, not an error — the seed script is idempotent and only seeds an empty database. If you genuinely want fresh seed data, drop and recreate the database first (see the reset warning in [Database setup](#database-setup)). |
| Port 3000 is already in use | Stop whatever else is using port 3000, or run Next.js on a different port: `npx next dev -p 3001` (then use that port in your browser and, if relevant, update Playwright's `baseURL` in `playwright.config.ts` for that run). |
| `npm test` fails immediately / can't connect | You're missing `.env.test`, or its `DATABASE_URL` points at a database that doesn't exist. See [Automated testing](#automated-testing) — create `stockpilot_test` and a matching `.env.test`. |
| `npm test` seems to have deleted your data | You pointed `.env.test`'s `DATABASE_URL` at your **development** database. Integration tests truncate all tables between test cases. Use a separate `stockpilot_test` database, always. |
| Playwright fails with a message about a missing browser executable | Run `npx playwright install chromium` once, then re-run `npm run test:e2e`. |
| Node/npm version seems to cause install errors | This repo doesn't pin a Node version, but very old Node versions may not support the tooling in use (Next.js 16, Prisma 7). Install a current Node.js LTS release (20+) and retry. |
| Windows: `git`, `node`, or `psql` "is not recognized" | The relevant installer didn't update your `PATH`, or you opened PowerShell before installing. Close and reopen PowerShell after installing each tool; reinstall with default options if the problem persists. |

---

## Development workflow

A simple workflow for making changes to this repository — it does not impose anything beyond
what's already set up here:

1. Create a branch for your change:
   ```bash
   git checkout -b your-branch-name
   ```
2. Install dependencies and configure your local database and `.env` (see the sections above) if
   you haven't already.
3. Run the app locally (`npm run dev`) and make your change.
4. Verify your change:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run test:e2e   # if your change touches a UI workflow
   ```
5. Commit your change with a clear message describing *why*, not just *what*.

See [`CLAUDE.md`](CLAUDE.md) for the fuller set of project conventions (architecture layering,
testing priorities, and how business-rule ambiguity is handled) followed during this project's
development.
