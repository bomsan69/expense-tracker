# FLOW.md — Autonomous Build Schedule

**Project:** Expense Tracker · Next.js · TypeScript · MySQL · drizzle-orm
**Requirements:** `SPEC.md` · **Agent rules:** `AGENTS.md` (canon, all agents) + `CLAUDE.md` (Claude Code additions)

Five phases, executed in order. Each phase declares an **Objective**, **Deliverables**, and a **Programmatic Gate**.

## How the gate works

The gate replaces human approval. Run every command in the phase's gate, in order, from the project root.

```
implement the phase
  → run the full gate
      → every command exits 0  → append to BUILD_LOG.md, start the next phase
      → any command exits ≠ 0  → fix the cause, re-run the FULL gate from the top
```

**Rules**

1. No phase starts while an earlier gate is red.
2. **Never weaken a gate to pass it.** Deleting or `.skip`-ing a test, `--passWithNoTests`, blanket `eslint-disable`, `@ts-ignore` over a real error, relaxing `tsconfig` strictness, or lowering a threshold is a **build failure**, not a fix. If a gate command is itself wrong, fix the command, state that in `BUILD_LOG.md`, and re-run.
3. A fix means re-running the **whole** gate, not just the failed command.
4. **Three-strike rule:** the same command failing 3 times with an unchanged error → stop, write the command, full output, and two hypotheses to `BUILD_LOG.md`, report to the human. Do not thrash.
5. **`BUILD_LOG.md` entry is part of every gate**: phase number, commands run, result, assumptions taken, deviations from `SPEC.md`.
6. Only two legitimate blockers: a secret that cannot be invented, or a `SPEC.md` contradiction no reading resolves. Everything else → decide, document, continue.

Gate prerequisites for every phase:

- **A git repository.** Run `git init` before Phase 1. Phase 2's migration-sync check uses `git status`; outside a repo it would pass without checking anything.
- **A reachable MySQL 8** with the databases from `DATABASE_URL` and `TEST_DATABASE_URL` created, and `.env` populated. Start it with `docker compose up -d mysql` (Phase 1 deliverable) — the bare `up -d` would also try to build the `app` image, which does not exist until Phase 5. Only if that also fails is MySQL a legitimate blocker — report it with the connection error.

---

## Phase 1 — Foundation & Toolchain

### Objective
Stand up a strict, verifiable Next.js + TypeScript skeleton with the full design token system, the authenticated shell, and every quality command wired up — so that from Phase 2 onward every change is checked automatically. **No business logic and no database access in this phase.**

### Deliverables

- `package.json` with every dependency from `SPEC.md §3` and the scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `verify`, `db:generate`, `db:migrate`, `db:seed`.
  - `verify` = `npm run typecheck && npm run lint && npm run test`
  - `lint` = `eslint . --max-warnings=0`  (**not** `next lint` — removed in Next.js 16)
  - `typecheck` = `tsc --noEmit`
- `next.config.ts` with **`output: 'standalone'`** — required by the production image (`SPEC.md §12`); setting it now means Phase 5's image build cannot fail on a missing bundle.
- `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, path alias `@/*`.
- ESLint (`next/core-web-vitals`) + Prettier, agreeing with each other.
- Vitest configured (jsdom environment, Testing Library, `@/` alias resolved) and Playwright configured for a **390×844** mobile viewport, with `@axe-core/playwright` installed.
- `app/globals.css` carrying the design tokens from `expense_tracker_design/globals.css` — `:root` custom properties, the `@theme inline` block, and the `@layer base` rules including the `:focus-visible` outline.
- `app/layout.tsx` with Inter via `next/font/google` (`subsets: ['latin']`, `display: 'swap'`, `variable: '--font-inter'`) and `<html lang="en">`.
- shadcn/ui initialised with the project tokens; Button, Input, Label, Select, Card, AlertDialog primitives generated.
- Shared shell components, **built once** and reused: `components/app/bottom-nav.tsx` (4 tabs: Home / Add / Stats / Settings, `fixed bottom-0`, safe-area inset, active item in accent, `lucide-react` icons per `SPEC.md §6.4`), `components/app/page-header.tsx` (title + optional back affordance), `components/app/empty-state.tsx`.
- `app/(app)/layout.tsx` composing header + bottom nav; `app/(auth)/login/` with **no** shell.
- Placeholder route files for all 9 screens from `SPEC.md §2`, each rendering its screen title, so every route resolves.
- `lib/money.ts` and `lib/dates.ts` — **complete implementations, test-first** (pure functions with no DB dependency, so they belong here rather than Phase 2): `formatMoney(cents) → "$1,248.50"`, `parseAmountToMinor("85.30") → 8530`, `formatDate("2026-10-31") → "Oct 31, 2026"`, `todayIso()`, `addDays(iso, n)`, `defaultDateRange()` returning `{ from: today − 7, to: today }`.
- `docker-compose.yml` with **only the `mysql` service** at this stage (`mysql:8.0`, `utf8mb4_unicode_ci`, named volume, port published to `127.0.0.1` only) plus `docker/init.sql` creating both databases named in `SPEC.md §3` on first boot — so the Phase 2 gate prerequisite is satisfiable without manual setup. Phase 5 **extends this same file** with the `app` and `migrate` services; do not create a second compose file.
- `.env.example` with the names from `SPEC.md §3` and empty values; `.gitignore` covering `node_modules/`, `.next/`, `.env*` (but **not** `.env.example`), coverage output.
- `BUILD_LOG.md` created with a Phase 1 entry.

### Programmatic Gate

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
# every declared route resolves and no secret leaked into the repo
test -f app/globals.css && test -f app/layout.tsx && test -f next.config.ts
grep -q "output: 'standalone'" next.config.ts
test -f docker-compose.yml
test -f app/\(auth\)/login/page.tsx
test -f app/\(app\)/layout.tsx
test -f app/\(app\)/page.tsx
test -f app/\(app\)/expenses/new/page.tsx
test -f "app/(app)/expenses/[id]/page.tsx"
test -f app/\(app\)/stats/page.tsx
test -f app/\(app\)/settings/page.tsx
test -f app/\(app\)/settings/categories/page.tsx
test -f app/\(app\)/settings/password/page.tsx
test -f app/\(app\)/receipt/review/page.tsx
# names only: a '#' comment or nothing may follow '=', never a value
test -f .env.example && ! grep -qE '^(SESSION_SECRET|ENCRYPTION_KEY|DATABASE_URL)=[^#[:space:]]' .env.example
grep -q '\.env' .gitignore
# money and date helpers are already under test
npx vitest run lib/money.test.ts lib/dates.test.ts
```

**Pass condition:** all commands exit 0. `npm run build` output is clean — no type error, no ESLint warning, no missing-module warning.

---

## Phase 2 — Data Layer & Core Business Logic

### Objective
Build the MySQL schema, migrations, and every pure domain rule — money, dates, validation, filtering, pagination, and statistics aggregation — **test-first**, with tenant isolation proven by a test rather than asserted in prose. No UI work in this phase.

### Deliverables

- `db/schema.ts` — drizzle definitions for `users`, `categories`, `expenses` exactly as `SPEC.md §5` specifies: column types, nullability, defaults, foreign keys (`users` cascade, `categories` restrict), and the indexes `UNIQUE (user_id, name_normalized)`, `(user_id, spent_on)`, `(user_id, category_id, spent_on)`.
- `drizzle.config.ts`; generated SQL migrations committed under `db/migrations/`; `db/index.ts` exporting a `mysql2`-backed drizzle client.
- `db/seed.ts` — idempotent: one user from `SEED_USER_EMAIL`/`SEED_USER_PASSWORD` (argon2id hashed) plus the categories **Food, Home, Travel, Health**. Re-running creates no duplicates.
- `lib/money.ts`, `lib/dates.ts` — already complete from Phase 1; this phase only keeps their tests green as a regression check. **Integer cents only; no float arithmetic on money.**
- `lib/validation/*.ts` — zod schemas for every field rule in `SPEC.md §8.1`, with the exact error copy from that table.
- `lib/auth/password.ts` — argon2id hash + constant-time verify.
- `lib/crypto/api-key.ts` — AES-256-GCM encrypt/decrypt plus `last4`; round-trip tested; ciphertext format `base64(iv).base64(tag).base64(ct)`.
- `lib/queries/expenses.ts` — list (filtered, paginated, `spent_on DESC, id DESC`, 10/page), total for the **same** filter condition, get-by-id, create, update, delete, atomic `createMany` for the receipt batch. **Every function takes `userId` as a required parameter and includes it in the `where`.**
- `lib/queries/categories.ts` — list (ascending by label, case-insensitive), create with case-insensitive per-user uniqueness, rename preserving `id`. **No delete.**
- `lib/queries/stats.ts` — `monthlyTotals(userId)` returning the current month plus the previous 5, and `categoryBreakdownLastMonth(userId)` returning real sums plus percentages reconciled to 100%.
- Vitest split into two projects: a **node**-environment project for `db/` and `lib/` (the DB integration tests — `mysql2` cannot run under jsdom) and the existing **jsdom** project for component tests. `npm run test` runs both.
- Integration tests against `TEST_DATABASE_URL` that create their own fixtures and read them back through these same functions.
- **`lib/queries/isolation.test.ts`** — creates user A and user B with rows for each, then for **every** read, update, delete, and aggregate function asserts: user B sees none of A's rows; user B updating/deleting A's row affects 0 rows and reports not-found; `monthlyTotals` and `categoryBreakdownLastMonth` for B exclude A's amounts entirely.

### Programmatic Gate

```bash
npm run typecheck
npm run lint
# schema and committed migrations are in sync: this phase's migrations are generated and
# COMMITTED during implementation, so re-generating here must add nothing and change nothing.
git rev-parse --is-inside-work-tree   # fail loudly if there is no repo, rather than pass vacuously
BEFORE=$(ls db/migrations/*.sql | wc -l)
npm run db:generate
test "$(ls db/migrations/*.sql | wc -l)" = "$BEFORE"
test -z "$(git status --porcelain db/migrations/)"
npm run db:migrate
npm run db:seed
npm run db:seed                      # idempotency: second run must also exit 0
npm run test
npx vitest run lib/queries/isolation.test.ts
npx vitest run lib/money.test.ts lib/dates.test.ts lib/validation lib/crypto
npx vitest run lib/queries/stats.test.ts
# no float math on money: format integer cents with Intl.NumberFormat, never parseFloat/toFixed.
# perl for portability — BSD grep does not support \s in a basic regex, so the old guard matched nothing.
perl -ne 'exit 1 if /parseFloat|toFixed/' lib/money.ts
! grep -rn "sql.raw" lib --include=*.ts
npm run build
```

**Pass condition:** all commands exit 0. `db:generate` produces no pending migration diff. The isolation test passes. Stats tests assert against **hand-computed** totals over seeded rows, never against a value copied from program output.

---

## Phase 3 — Feature Implementation (server-side behaviour)

### Objective
Implement every mutation and read path as a server action over the Phase 2 query layer: authentication and session handling, expense CRUD, category management, password change, AI settings, receipt parsing, atomic batch save, and statistics. Behaviour complete and tested; presentation still minimal.

### Deliverables

- `lib/auth/session.ts` — issue, verify, refresh, and clear the signed JWT cookie (HS256, httpOnly + `secure` + `sameSite=lax`, 7-day expiry, claims `{ userId, tokenVersion }`); verification checks the signature **and** that `tokenVersion` matches the DB.
- `middleware.ts` — redirects unauthenticated requests for any protected path to `/login`, and authenticated requests for `/login` to `/`. Static assets excluded.
- **Every server action independently re-verifies the session and derives `userId` from it** — never from a form field, body, query param, or client state. Middleware alone is not authorization.
- All actions return a discriminated result: `{ ok: true, data } | { ok: false, error }`. No raw DB error, driver message, or stack trace crosses to the client.
- `app/(auth)/login/actions.ts` — authenticate (constant-time verify), single generic failure message, issue session, redirect to `/`.
- `app/(app)/actions.ts` — filtered + paginated list and matching total from **one shared query condition**; filter state reflected in the URL (`from`, `to`, `category`, `page`); invalid range rejected before any query runs; out-of-range page clamped.
- `app/(app)/expenses/new/actions.ts` — `createExpense`; `parseReceipt` (image validation: JPEG/PNG/WebP/HEIC, ≤ 10 MB; 30s timeout; calls Anthropic with the user's decrypted key; returns one proposed item per line item, excluding tax/tip/subtotal/total; flags possible duplicates). **Image held in memory only; never written to disk or a table. Nothing auto-saves.**
- `app/(app)/expenses/[id]/actions.ts` — `getExpense` (user-scoped; foreign or missing ID → **not found**, never "forbidden"), `updateExpense`, `deleteExpense` with a server-side ownership re-check.
- `app/(app)/receipt/review/actions.ts` — `saveBatch`: validates every row, writes all rows in **one transaction**, rolls the whole batch back on any failure.
- `app/(app)/settings/actions.ts` — `saveAiSettings` (blank key field = keep the stored key; a provided key is encrypted and `last4` recorded; the raw key is never returned, never logged, never put in an error) and `logout` (clears the cookie).
- `app/(app)/settings/categories/actions.ts` — `createCategory`, `renameCategory` (stable `id`). No delete action exists.
- `app/(app)/settings/password/actions.ts` — verify current, enforce the policy, reject new == current, increment `token_version` to invalidate other sessions, re-issue this device's cookie.
- `lib/ai/parse-receipt.ts` — provider call, strict zod parse of the response, and typed failures for timeout, auth/credit rejection, and no-items-found. Single provider; **no provider abstraction layer**.
- Tests: every action's happy path and every failure path; an auth test that an unauthenticated action call is rejected; a test that each action rejects a foreign `userId` supplied through its input; AI calls mocked at the SDK boundary (no live network in tests).

### Programmatic Gate

```bash
npm run typecheck
npm run lint
npm run test
npx vitest run app                           # all server action tests
npx vitest run lib/auth lib/ai
npx vitest run lib/queries/isolation.test.ts # still green from Phase 2
# session claims and route protection exist
grep -q "httpOnly" lib/auth/session.ts && grep -q "tokenVersion" lib/auth/session.ts
grep -q "login" middleware.ts
# every server action file verifies a session itself
for f in $(find app -name 'actions.ts'); do grep -q "ession" "$f" || { echo "NO SESSION CHECK: $f"; exit 1; }; done
# the API key and passwords are never logged, and no secret is hardcoded
! grep -rn "console.log" lib/crypto lib/auth app --include=*.ts
! grep -rniE "(api[_-]?key|password|secret)\s*[:=]\s*['\"][A-Za-z0-9_/+-]{12,}" app lib db --include=*.ts
# receipt images are never persisted
! grep -rnE "writeFile|createWriteStream" lib/ai app --include=*.ts
npm run build
```

**Pass condition:** all commands exit 0. Every action is session-verified, the isolation test still passes, and no grep guard trips.

---

## Phase 4 — UI/UX & State Integration

### Objective
Build all 9 screens to the design system, wired to the Phase 3 actions, with the complete state set — default, loading, empty, invalid/error, success — and full accessibility. Every Screen ID in `SPEC.md §7` is implemented and visually faithful to `expense_tracker_design/`.

### Deliverables

- **SCR-01 Login** — centred, no shell, `Enter` submits, loading disables submit, single generic inline credential error (**STATE-01**).
- **SCR-02 Home** — primary dark **Total Spending** summary card; From / To date inputs; Category select defaulting to *All*; list rows (Date · Category / Merchant · Amount) with the merchant as a link to SCR-03; pagination `‹ 1 2 3 ›`; filter change resets to page 1 and refreshes total **and** list together; loading skeleton; **empty state showing `$0.00` and the `SearchX` empty message (STATE-02)**; invalid-range inline validation.
- **SCR-03 Expense Detail** — full form (date, category, merchant, amount, notes), **Save Changes**, destructive **Delete Expense** behind a shadcn `AlertDialog` (**STATE-03**); not-found state; save failure keeps the user's edits; dirty-form indication.
- **SCR-04 Add Expense** — form defaulting the date to today; **Save Expense**; the `OR IMPORT A RECEIPT` divider; **Take Photo** (`capture="environment"`) and **Choose from Album** pickers; parse progress; permission-denied and timeout messages each offering manual entry; parsed items written to `sessionStorage` (`receipt_draft`) then navigate to SUP-01. The Save CTA stays reachable with the on-screen keyboard open.
- **SCR-05 Settings** — `ACCOUNT` / `CATEGORIES` / `AI CONFIGURATION` sections, `SettingsRow`s with `ChevronRight` to SUP-03 and SUP-02, AI Model input, **masked** API Key input (`••••••••1234`, never unmasked by default), **Save Settings**, **Log Out**.
- **SCR-06 Statistics** — Recharts bar chart of the current month plus the previous 5, and a pie chart of the previous full calendar month by category with names and percentages; tooltips; **an accessible `<table>` equivalent for each chart**; loading, error, and informative empty-chart states.
- **SUP-01 Receipt Review** — filename caption, editable and removable item rows, duplicate-row warnings, the `Total · n items` reconciliation line, **Confirm & Save All**, **Cancel**; per-row validation errors block save and name the row; a batch failure keeps every edit; no draft → redirect to SCR-04; save disabled when the list is empty.
- **SUP-02 Manage Categories** — New Category Name input, **Add Category**, `EXISTING CATEGORIES` rows with inline **Edit**, ascending order, blank and duplicate errors. **No delete control anywhere.**
- **SUP-03 Change Password** — three masked inputs, **Update Password**, policy message, mismatch and wrong-current-password errors, success confirmation then return to SCR-05.
- Cross-cutting: tokens only — **no raw hex and no inline style in any component**; `lucide-react` only, per the `SPEC.md §6.4` map; every input has a `<label>`; invalid fields carry `aria-invalid` + `aria-describedby`; icon-only buttons have accessible names; decorative icons are `aria-hidden`; touch targets ≥ 44×44px; the bottom nav exists **only** in `app/(app)/layout.tsx`; buttons disabled during a mutation with input preserved on failure.
- Component tests (Testing Library) covering, per screen, the default / loading / empty / error states and keyboard submission.

### Programmatic Gate

```bash
npm run typecheck
npm run lint
npm run test
npx vitest run components app                 # all component + screen tests
# design-token discipline: no raw hex, no inline style, one icon library, no emoji
! grep -rnE "#[0-9a-fA-F]{6}" app components --include=*.tsx
! grep -rn "style={{" app components --include=*.tsx
! grep -rn "from '@heroicons\|from 'react-icons\|from '@mui" app components --include=*.tsx
# no emoji in UI source (design-system.md: lucide icons only). perl is portable; grep -P is GNU-only.
perl -CSD -ne 'exit 1 if /[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}]/' $(find app components -name '*.tsx')
# the bottom nav is defined in the shell only
test "$(grep -rln 'BottomNav' app --include=*.tsx | grep -v '(app)/layout.tsx' | wc -l | tr -d ' ')" = "0"
# every form input has a label, and charts have a table alternative
grep -rq "<Label\|htmlFor=" components app --include=*.tsx
grep -rq "<table" components/charts
# no delete affordance on categories (SPEC D8)
! grep -rniE "delete" app/\(app\)/settings/categories components/settings/category-row.tsx --include=*.tsx
npm run build
```

**Pass condition:** all commands exit 0 and every grep guard holds. Compare each screen against `expense_tracker_design/mockups/SCR-0*.png`, `SUP-0*.png`, and `STATE-0*.png`; record any intentional deviation in `BUILD_LOG.md`.

---

## Phase 5 — Integration Testing, Accessibility & Bundling

### Objective
Prove the whole product end-to-end on a real database at mobile viewport, confirm the accessibility and responsive requirements, verify every acceptance criterion in `SPEC.md §11`, and produce a clean production bundle **and a working Docker deployment** (`SPEC.md §12`).

### Deliverables

- Playwright E2E suite in `tests/e2e/`, run at **390×844** against a migrated and seeded `TEST_DATABASE_URL`, covering:
  - `auth.spec.ts` — unauthenticated access to each protected route redirects to `/login`; invalid credentials show the inline error (**STATE-01**); successful login lands on SCR-02; an authenticated visit to `/login` redirects to `/`; **Log Out** returns to SCR-01 and re-protects the routes.
  - `expenses.spec.ts` — create via SCR-04 → appears on SCR-02 with the total updated; open via the merchant link → SCR-03; edit → total and list both refresh; delete → confirmation dialog (**STATE-03**) → row gone and total reduced; a direct URL for a non-existent ID shows not-found.
  - `filters.spec.ts` — the default range is today − 7 → today inclusive; changing a filter resets to page 1; list **and** total change together; a filter matching nothing shows `$0.00` and the empty state (**STATE-02**); `From > To` shows the validation message and fires no query; pagination holds at 10 per page with bounds respected.
  - `receipt.spec.ts` — with the AI call stubbed: picking an image produces proposed rows on SUP-01; **nothing is saved before confirmation**; editing and removing rows works; **Confirm & Save All** writes every row and lands on SCR-02; **Cancel** writes nothing and returns to SCR-04; a stubbed provider failure offers retry or manual entry.
  - `settings.spec.ts` — saving the AI config persists the model and shows the key **masked only**; the raw key never appears in the DOM or any network response body; adding a category makes it selectable on SCR-04; renaming it updates existing expenses' displayed label while their IDs are unchanged; blank and duplicate names are rejected.
  - `password.spec.ts` — wrong current password rejected; a weak new password rejected with the policy message; mismatch rejected; a valid change succeeds and the new password logs in.
  - `stats.spec.ts` — with known seeded rows, the 6 bar values and the previous-month category percentages match **hand-computed** figures; the accessible table is present and carries the same numbers as the chart; with no expenses, the empty-chart message appears.
  - `a11y.spec.ts` — `@axe-core/playwright` on all 9 screens: **zero serious or critical violations**.
  - `responsive.spec.ts` — at 320 / 390 / 430px: no horizontal overflow (`scrollWidth <= clientWidth`), and the bottom nav is visible and not overlapping the primary CTA.
- **Manual accessibility checklist** in `BUILD_LOG.md`, recorded screen by screen: 200% text zoom clips nothing (`SPEC.md §6.3`, §6.8). This one stays a requirement but is checked by hand — automating a zoom-clipping verdict is brittle enough to produce false verdicts, which `SPEC.md §9.11` forbids.
- Production build verified; bundle checked for obvious bloat (no accidental server-only import pulled into a client bundle, no duplicate chart library).
- A secret-leak sweep over the built output.
- **Docker deployment per `SPEC.md §12`:** a new multi-stage `Dockerfile` (`deps` → `build` → `runtime`, `node:22-alpine`, non-root, standalone output, **no secret baked in**), a new `.dockerignore`, and the **existing** `docker-compose.yml` from Phase 1 extended with the `app` and `migrate` services (`mysql` already there — edit the file, do not replace it). Verified by actually building the image and serving `/login` from the container — not by inspecting the files.
- `README.md` — setup, env vars, `db:migrate` / `db:seed`, how to run the gates, and the `docker compose` deployment steps.
- `BUILD_LOG.md` finalised: every phase, every gate result, every `SPEC.md §4` assumption relied on, and any deviation.

### Programmatic Gate

```bash
npm run typecheck
npm run lint
npm run test
npm run db:migrate
npm run db:seed
npx playwright install --with-deps
npm run test:e2e                              # full suite, 390x844
npx playwright test tests/e2e/a11y.spec.ts        # zero serious/critical axe violations
npx playwright test tests/e2e/responsive.spec.ts  # 320 / 390 / 430px, no overflow
npx playwright test tests/e2e/stats.spec.ts       # chart numbers reconcile with seeded rows
npm run build
# smoke the production server, then always shut it down
npm run start & SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT
for i in $(seq 1 60); do curl -sf -o /dev/null http://localhost:3000/login && break; sleep 1; done
curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/login | grep -q 200
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ | grep -qE '200|307'
# no secret in the built client bundle
! grep -rniE "(sk-ant|SESSION_SECRET|ENCRYPTION_KEY|mysql://)" .next/static 2>/dev/null
! grep -rn "password_hash" .next/static 2>/dev/null
# --- deployment (SPEC.md §12): the image must build and actually serve ---
test -f Dockerfile && test -f .dockerignore && test -f docker-compose.yml
grep -q "output: 'standalone'" next.config.ts
# no secret may be baked into the image
! grep -nE '^[[:space:]]*(ARG|ENV)[[:space:]]+(SESSION_SECRET|ENCRYPTION_KEY|DATABASE_URL|MYSQL_ROOT_PASSWORD)' Dockerfile
grep -qE '^\.env' .dockerignore
# the final stage must not ship the build toolchain or a bare .env
docker build -t expense-tracker:gate --target runtime .
test -z "$(docker run --rm --entrypoint sh expense-tracker:gate -c 'ls -A /app/.env 2>/dev/null')"
test "$(docker run --rm --entrypoint sh expense-tracker:gate -c 'id -u')" != "0"   # non-root
# full stack comes up and serves the login page from inside the container
docker compose up -d --build
docker compose run --rm migrate
for i in $(seq 1 60); do curl -sf -o /dev/null http://localhost:3000/login && break; sleep 2; done
curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/login | grep -q 200
docker compose down
# docs and log present
test -f README.md && test -f BUILD_LOG.md
test -f .env.example && ! grep -qE '^(SESSION_SECRET|ENCRYPTION_KEY)=[^#[:space:]]' .env.example
```

**Pass condition:** every command exits 0, the whole E2E suite is green, axe reports no serious or critical violations, no responsive overflow at any tested width, chart figures reconcile with seeded data, no secret appears in the build output or the image, and the containerised stack serves `/login`. The manual 200% zoom checklist is recorded in `BUILD_LOG.md` screen by screen.

---

## Project definition of done

1. All five phase gates green, in order, with no gate weakened to achieve it.
2. All 9 Screen IDs (SCR-01…SCR-06, SUP-01…SUP-03) implemented with their full state sets, matching `expense_tracker_design/`.
3. Every acceptance criterion in `SPEC.md §11` covered by a passing automated test.
4. Every `SPEC.md §4` resolved decision implemented as written, and every assumption actually relied on recorded in `BUILD_LOG.md`.
5. Tenant isolation proven by test; no secret in source, logs, errors, the build output, or the Docker image; no fabricated figure anywhere in the code or the tests.
6. `docker compose up -d --build` serves the app on a clean host, with migrations applied by the one-shot `migrate` service (`SPEC.md §12`).
