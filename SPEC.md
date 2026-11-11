# SPEC.md — Expense Tracker Specification

**Version:** 1.0 · **Date:** 2026-11-01 · **Status:** Implementation-ready
**Source of record:** `expense_tracker_uiux_spec_v1.pptx` (16 slides) + `expense_tracker_design/` handoff package
**Product:** Mobile web application for an authenticated individual to record and understand household spending.
**Tagline from the deck:** *Track spending. Understand habits.*

Scope: **6 core screens (SCR-01…SCR-06) + 3 supporting workflows (SUP-01…SUP-03) = 9 screens.**
The deck notes the original request said "5 screens" but enumerated 6. All 6 core screens are in scope, plus all 3 supporting views.

All in-app text is **English**. All Screen IDs below match the source deck exactly and must be preserved in code comments, route names where sensible, and test names.

---

## 1. Users & use cases

**User:** a single authenticated individual recording household expenses. Multi-user *accounts* (sharing a ledger) are out of scope; the system is nonetheless multi-tenant by `user_id` at the data layer (see §5, §9).

**Core use cases**

1. Review and filter spending by date range and category.
2. Add, edit, and delete expenses.
3. Scan a receipt and import its line items after review.
4. View spending trends (6-month bar chart, last-month category breakdown).
5. Configure account password, categories, and AI integration.

---

## 2. Screen inventory

| ID | Screen | Auth | Route | Notes |
|---|---|---|---|---|
| SCR-01 | Login | Unauthenticated | `/login` | No header, no footer nav |
| SCR-02 | Home / Expense List | Authenticated | `/` | Landing page after login |
| SCR-03 | Expense Detail / Edit | Authenticated | `/expenses/[id]` | Edit + delete |
| SCR-04 | Add Expense | Authenticated | `/expenses/new` | Manual + receipt import entry |
| SCR-05 | Settings | Authenticated | `/settings` | Account, categories, AI config, logout |
| SCR-06 | Statistics | Authenticated | `/stats` | Bar chart + pie chart |
| SUP-01 | Receipt Review | Authenticated | `/receipt/review` | Reached from SCR-04 after parsing |
| SUP-02 | Manage Categories | Authenticated | `/settings/categories` | Add + edit (no delete) |
| SUP-03 | Change Password | Authenticated | `/settings/password` | Current + new + confirm |

### Navigation flow

```
SCR-01 Login ──sign in──> SCR-02 Home ──merchant link──> SCR-03 Detail ──save/delete──> SCR-02
                              │
   Footer tabs (SCR-02..SCR-06, SUP-01..SUP-03): Home / Add / Stats / Settings
                              │
SCR-04 Add ──camera|album──> parse ──> SUP-01 Receipt Review ──Confirm & Save All──> SCR-02
SCR-04 Add ──Save Expense──> SCR-02                           ──Cancel──> SCR-04
SCR-05 Settings ──> SUP-02 Manage Categories ──back──> SCR-05
SCR-05 Settings ──> SUP-03 Change Password ──success──> SCR-05
SCR-05 Settings ──Log Out──> SCR-01
```

- Unauthenticated access to any protected route → redirect to `/login`.
- Successful login → `/` (SCR-02).
- Already-authenticated visit to `/login` → redirect to `/`.

---

## 3. Technical stack

**Mandated by the client (non-negotiable):** Next.js · TypeScript · MySQL · drizzle-orm.

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15+, App Router** | Server Components by default; Server Actions for all mutations |
| Language | **TypeScript 5+, `strict: true`** | No `any`; `noUncheckedIndexedAccess` on |
| Database | **MySQL 8.0+** | `utf8mb4` / `utf8mb4_unicode_ci` |
| ORM | **drizzle-orm** + `drizzle-kit` | `mysql2` driver; schema in `db/schema.ts`; SQL migrations committed |
| Styling | **Tailwind CSS v4** | Tokens from `expense_tracker_design/globals.css` via `@theme inline` |
| Components | **shadcn/ui** | Button, Input, Select, Card, AlertDialog, Label |
| Icons | **lucide-react** — one icon library only | Sizes/names per §6.4 |
| Font | **Inter** via `next/font/google` | `subsets: ['latin']`, `display: 'swap'`, `variable: '--font-inter'` |
| Charts | **Recharts** | Bar + pie; each with an accessible table equivalent |
| Validation | **zod** | One schema per input shape, shared client/server, enforced server-side |
| Auth | **Custom session: signed JWT (HS256) in an httpOnly cookie** | `jose`; no NextAuth (see D1) |
| Password hashing | **argon2id** (`@node-rs/argon2`) | bcrypt cost ≥ 12 acceptable fallback |
| Key encryption | **AES-256-GCM** via node `crypto` | For the stored AI API key (D5) |
| AI | **OpenAI API** (`openai`) | Vision receipt parsing, BYOK (D5) |
| Unit/integration tests | **Vitest** + Testing Library | `*.test.ts(x)` beside the unit |
| E2E tests | **Playwright** | `tests/e2e/`, mobile viewport 390×844 |
| Lint / format | **ESLint** (`next/core-web-vitals`, `--max-warnings=0`) + **Prettier** | |
| A11y audit | **axe-core** via `@axe-core/playwright` | Zero serious/critical violations |
| Package manager | **npm** | Committed `package-lock.json` |
| Deployment | **Docker** — multi-stage build on `node:22-alpine` | `docker compose` runs app + MySQL; requires `next.config.ts` `output: 'standalone'` (§12) |

Nothing outside this table may be added without recording the justification in `BUILD_LOG.md`.

### Environment variables (`.env.example` carries names with empty values only)

```
DATABASE_URL=              # mysql://user:pass@host:3307/expense_tracker
TEST_DATABASE_URL=         # mysql://user:pass@host:3307/expense_tracker_test
SESSION_SECRET=            # >=32 bytes, HS256 signing key
ENCRYPTION_KEY=            # 32-byte key, base64, for AES-256-GCM of the AI API key
SEED_USER_EMAIL=
SEED_USER_PASSWORD=
MYSQL_ROOT_PASSWORD=       # local docker-compose MySQL only; not used by the app
OPENAI_BASE_URL=           # optional; OpenAI-compatible endpoint (e.g. OpenRouter). Blank = OpenAI's own.
```

---

## 4. Resolved decisions

The source deck marks 9 items `CONFIRM REQUIRED` / `PROPOSED`, and `expense_tracker_design/open-decisions.md` states they are **not approved requirements**. Autonomous implementation cannot proceed with open specs, so each is resolved below as an **agent-adopted default**. Build exactly to the "Resolved" column. If a stakeholder overrides any row, edit only that row and the code it governs.

| # | Open question (deck) | **Resolved for v1.0** |
|---|---|---|
| **D1** | Authentication: username or email? Registration/recovery? Session expiry? | **Email + password.** Login field accepts an email address (label: `Email` — the deck's `Email or Username` is corrected here, since the field is validated as an email and usernames are not supported). **No self-service registration and no password recovery UI** — users are created by `npm run db:seed`. Session = signed JWT (HS256) in an httpOnly, `secure`, `sameSite=lax` cookie, **7-day expiry**, refreshed on each authenticated request. A `token_version` claim allows server-side invalidation. |
| **D2** | Expense data: currency, timezone, required fields, notes, receipt storage | **Currency USD**, display `en-US` (`$1,248.50`). Money stored as **integer minor units (cents)** in `BIGINT`. Dates are **calendar dates with no time or timezone** (MySQL `DATE`, ISO `YYYY-MM-DD`); all date math is calendar-day arithmetic, server-local-free. **Required:** date, category, merchant, amount > 0. **Optional:** notes (max 500 chars). **Receipt images are never stored** (see D6). |
| **D3** | Date interpretation: rolling 7 days vs today − 7 inclusive | **`From = today − 7 calendar days`, `To = today`, both inclusive → 8 distinct dates.** This matches the literal wording on deck slide 6. Filtering is `spent_on BETWEEN from AND to` inclusive. |
| **D4** | Receipt parsing: one expense per receipt or per line item? Tax/tip? Duplicates? | **One proposed expense per line item.** Tax, tip, subtotal, and total lines are **excluded** from the proposed items (the receipt's own total is shown for reconciliation only). A proposed item whose (date, merchant, amount) matches an existing expense is **flagged as a possible duplicate but not blocked** — the user decides during SUP-01 review. |
| **D5** | AI provider/model/key: BYOK vs server key, encryption | **Bring-your-own-key (BYOK), single provider: OpenAI.** The user enters a model string (default `gpt-4o-mini`) and their own API key on SCR-05, with a **Verify** button that checks both against the provider (via `models.retrieve`) without saving. The key is encrypted **AES-256-GCM** at rest with `ENCRYPTION_KEY`, decrypted server-side only at call time, and returned to the client **only** as a masked last-4 (`••••••••1234`). Never logged, never echoed in an error. No multi-provider abstraction layer. |
| **D6** | Batch save: atomic vs partial? Image retention? | **Atomic.** `Confirm & Save All` writes every reviewed item in **one DB transaction**; any failure rolls the whole batch back and the review screen keeps the user's edits. **Receipt images are processed in memory only** — never written to disk, never stored in a table. Only the original filename is shown during the session, and it is not persisted. |
| **D7** | Statistics: current + previous 5 months, or 6 completed months? Chart library? | **Current month + the previous 5 = 6 buckets including the current (partial) month**. The six month labels are **computed at runtime from the current month**, never hardcoded; the deck's `Jun…Nov` axis is simply what that computation yields for a November 2026 "today". Pie chart covers the **previous full calendar month**. Chart library: **Recharts**. |
| **D8** | Categories: delete/merge, ordering, rename semantics | **No delete, no merge** (deck SUP-02: "Delete — not requested; omit unless confirmed"). Create and rename only. Ordering is **ascending by label**, case-insensitive. **Category `id` is stable across renames**, so historical expenses follow the new label. Names are unique per user, case-insensitively. |
| **D9** | Password policy, post-change session behaviour, a11y copy, localisation | **Policy: ≥ 10 characters, at least one letter and one digit**, new ≠ current, new == confirmation. On success, **all other sessions are invalidated** (increment `token_version`) and the current session is re-issued, so the user stays logged in on this device only. Error copy per §8. **No i18n layer** — English string literals in place; single currency, single locale. |
| **D10** | *(Implementation gap, not in the deck)* How do parsed items survive SCR-04 → SUP-01? | **Client-side `sessionStorage`** under key `receipt_draft`. Chosen over a server-side draft table and over an encrypted cookie: it adds no table and keeps parsed receipt content off the server between parse and save, consistent with D6. SUP-01 with no draft present → redirect to SCR-04. |

---

## 5. Data model

MySQL 8, `utf8mb4_unicode_ci`. Defined in `db/schema.ts` with drizzle-orm; migrations generated by `drizzle-kit` and committed under `db/migrations/`.

### `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, auto-increment |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` (argon2id) |
| `token_version` | `INT UNSIGNED` | `NOT NULL DEFAULT 0` — bumped to invalidate sessions (D9) |
| `ai_model` | `VARCHAR(128)` | `NULL` |
| `ai_api_key_ciphertext` | `TEXT` | `NULL` — AES-256-GCM, format `base64(iv).base64(tag).base64(ct)` |
| `ai_api_key_last4` | `CHAR(4)` | `NULL` — for masked display only |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

### `categories`

| Column | Type | Constraints |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, auto-increment |
| `user_id` | `BIGINT UNSIGNED` | `NOT NULL`, FK → `users.id` `ON DELETE CASCADE` |
| `name` | `VARCHAR(64)` | `NOT NULL` — display label, trimmed |
| `name_normalized` | `VARCHAR(64)` | `NOT NULL` — `LOWER(TRIM(name))`, for uniqueness |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

Indexes: `UNIQUE (user_id, name_normalized)`, `INDEX (user_id, name)`.

### `expenses`

| Column | Type | Constraints |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, auto-increment |
| `user_id` | `BIGINT UNSIGNED` | `NOT NULL`, FK → `users.id` `ON DELETE CASCADE` |
| `category_id` | `BIGINT UNSIGNED` | `NOT NULL`, FK → `categories.id` `ON DELETE RESTRICT` |
| `spent_on` | `DATE` | `NOT NULL` — calendar date, no timezone (D2) |
| `merchant` | `VARCHAR(160)` | `NOT NULL`, trimmed, non-empty |
| `amount_minor` | `BIGINT` | `NOT NULL`, must be `> 0` (enforced in domain + validation) |
| `notes` | `VARCHAR(500)` | `NULL` |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

Indexes: `INDEX (user_id, spent_on)` (list + range filter), `INDEX (user_id, category_id, spent_on)` (category filter + stats).

**No `receipts` / `receipt_batches` table** — D6 forbids retaining receipt content, and nothing in the UI reads batch history.

### Seed data (`npm run db:seed`)

One user from `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`, plus the four categories shown on deck slide 12: **Food, Home, Travel, Health**. Idempotent — re-running must not duplicate rows.

### Domain invariants (test-first, §11)

- Money is **integer cents** at every layer. No float arithmetic on money, ever. A single formatter converts cents → `$1,248.50` at the view edge; a single parser converts a typed `"85.30"` → `8530`, rejecting more than 2 decimal places.
- Dates are ISO `YYYY-MM-DD` strings internally; a single formatter renders `Oct 31, 2026`.
- Totals are always computed by the **same query condition** as the list they accompany (deck slide 6: "refreshes list and total together").

---

## 6. UI/UX design requirements

Authority: `expense_tracker_design/`. Reproduced here so the spec is self-contained. The PDF/PNG mockups are **conceptual** — they use compact illustrative type; production must use the type tokens below (16px body).

### 6.1 Direction

**Modern Minimal** — simple, professional, legible. Mostly white surfaces, minimal shadows, restrained blue for actionable controls and selected states. Do not invent unrelated visual features. Three brand roles only; neutrals and semantic danger colours are not additional brand colours. Any colour-carried state must **also** carry text or an icon.

### 6.2 Color roles

| Role | Hex | Use |
|---|---|---|
| Primary | `#1F2937` | brand structure, dark summary card, prominent headings |
| Secondary | `#F3F4F6` | subtle secondary fill, muted backgrounds |
| Accent | `#2563EB` | primary CTA, selected nav state, links, focus ring |
| Background / Surface / Card | `#FFFFFF` | app background and cards |
| Foreground | `#111827` | normal text |
| Muted foreground | `#6B7280` | helper text |
| Border | `#E5E7EB` | dividers, quiet boundaries |
| Input border | `#D1D5DB` | form control boundary |
| Destructive | `#B91C1C` | deletion and errors only |
| Destructive background | `#FEF2F2` | destructive surface |

Consume these as the semantic Tailwind tokens defined in `globals.css` (`bg-accent`, `text-muted-foreground`, `border-border`, …). **No raw hex in components.** Maintain WCAG 2.2 AA contrast.

### 6.3 Typography

**Inter** only, via `next/font/google` (`subsets: ['latin']`, `display: 'swap'`, `variable: '--font-inter'`).

| Usage | Size / line-height | Weight |
|---|---|---|
| Page title | 24 / 32 px | 700 |
| Section heading | 20 / 28 px | 600 |
| Card title | 18 / 26 px | 600 |
| Body | 16 / 24 px | 400 |
| Secondary | 14 / 20 px | 400 |
| Caption | 12 / 16 px | 400 |
| Button | 16 / 24 px | 600 |

Body text is **16px in production** regardless of the denser mockup renders. Text must zoom to 200% without clipping.

### 6.4 Geometry, icons, layout

- Reference viewport **390 × 844**; minimum supported width **320px**; fluid above. Verify at 320 / 390 / 430 / tablet. A `max-width` container centres content on wide screens — do not inflate single-column cards.
- Horizontal page padding **16px**. Spacing steps **4 / 8 / 12 / 16 / 24 / 32px**.
- Control height **48–50px**; every touch target **≥ 44 × 44 CSS px**.
- Radii: **6px** small, **10px** control, **14px** card, full pill where needed. Borders 1px neutral. Card shadow `0 2px 9px rgba(16,24,40,.025)` optional.
- Respect `env(safe-area-inset-bottom)`. Content scrolls above the sticky footer. **The on-screen keyboard must not obscure the primary Save CTA.**
- No horizontal overflow at any supported width.
- Icons: **lucide-react** outline, stroke width 2, default 20px / compact 16px / prominent 24px. Map: `House` (Home nav), `CirclePlus` (Add nav), `ChartNoAxesColumn` (Stats nav), `Settings` (Settings nav), `ChevronLeft` (back), `ChevronRight` (row disclosure), `CalendarDays`, `Camera`, `ImagePlus`, `Pencil`, `Trash2`, `ReceiptText`, `Wallet`, `SearchX`, `Check`, `LogOut`, `EyeOff`. Icon-only buttons need accessible names; decorative icons are `aria-hidden="true"`. The pictograms in the PDF are placeholders — **no emoji, no bespoke icon art**.

### 6.5 Shared shell

- **Header:** page title on all authenticated screens; **back affordance** on secondary pages (SCR-03, SCR-04, SCR-05, SCR-06, SUP-01, SUP-02, SUP-03). Back is history-first with a safe fallback to Home.
- **Footer:** fixed bottom nav on **all authenticated pages** — `Home / Add / Stats / Settings`, 4 equal columns, `fixed bottom-0 inset-x-0 border-t bg-background`, safe-area inset, active item in accent with its label. Built once in the authenticated layout, **never duplicated per page**.
- **SCR-01 has neither header nor footer**; content is vertically centred.

### 6.6 Component inventory

| Component / variant | Base | Layout | Token sketch | States | Used on |
|---|---|---|---|---|---|
| Button / primary | shadcn Button | `min-h-12 px-4`, full-width form actions | `bg-accent text-white rounded-[10px] font-semibold` | focus, disabled, loading | SCR-01/03/04/05, SUP-01/02/03 |
| Button / secondary | shadcn Button | `min-h-12 px-4` | `bg-secondary text-foreground rounded-[10px]` | focus, disabled | SCR-04, SUP-01 |
| Button / outline | shadcn Button | `min-h-12` | `border border-border bg-background rounded-[10px]` | focus, disabled | SUP-01 |
| Button / destructive | shadcn Button | `min-h-12` | `bg-red-50 text-destructive border border-red-200` | confirm, pending, error | SCR-03 |
| Input / standard | shadcn Input | `min-h-12 px-3` | `border-input bg-background rounded-[10px] focus-visible:ring-accent` | default, focus, invalid, disabled | SCR-01/03/04/05, SUP-02/03 |
| Select / category | shadcn Select | `min-h-12` | `rounded-[10px] border-border` | open, selected, empty | SCR-02/03/04 |
| Card / standard | shadcn Card | `p-4`, radius 14px | `bg-surface border-border rounded-[14px]` | loading, empty | SCR-02/06, SUP-01 |
| Summary / total | custom composition | `p-4`, fluid | `bg-primary text-white rounded-[14px]` | loading, empty | SCR-02 |
| ExpenseListItem | custom | `min-h-16` flex, amount right-aligned | `border-b border-border py-4` | active, keyboard focus | SCR-02 |
| Pagination | custom | `‹ 1 2 3 ›`, ≥44px targets | accent on current page | disabled bounds | SCR-02 |
| BottomNavigation | custom + `next/link` | 4 equal columns, safe-area inset | `fixed bottom-0 inset-x-0 border-t bg-background` | active, focus | all but SCR-01 |
| Dialog / delete | shadcn AlertDialog | fully accessible modal | `rounded-[14px]` | confirm, cancel, pending | SCR-03 |
| ReceiptRow | custom | `p-4`, editable list row | `border rounded-[14px]` | editing, error, remove | SUP-01 |
| CategoryRow | custom | row with inline edit action | `border-b py-4` | editing, validation | SUP-02 |
| SettingsRow | custom | label + `ChevronRight`, ≥48px | `border-b py-4` | focus, pressed | SCR-05 |
| Charts | Recharts | compact, responsive | neutral bars, accent highlight | loading, empty, tooltip | SCR-06 |
| FormField | custom wrapper | label above, error below | required indicator visible | invalid, disabled | all forms |

**Form rules:** visible `<label>` above every control, visible required indicator, inline error text below the control, `aria-invalid` + `aria-describedby` linking to it. Amount uses `inputMode="decimal"`; native date inputs where supported. `Enter` submits. Buttons are disabled **during** a mutation, and **form data is preserved on failure**. Never imply a mutation succeeded before the server confirms.

### 6.7 Required states

Five states are required wherever they are **meaningful** for the component: `default` · `loading` · `empty` · `invalid/error` · `success`.
Additionally, every focusable control carries a visible `focus-visible` style, and every control that can be disabled must not signal it by colour alone.
A state that cannot occur for a component is not required — a `Label` has no `loading` state. Async failures preserve user input.

### 6.8 Accessibility (WCAG 2.2 AA)

Labels on all inputs; `aria-invalid` + linked error elements; visible focus; AlertDialog announces title and description; ≥44px targets; 200% text zoom without clipping or overflow (verified manually, recorded in `BUILD_LOG.md`); keyboard-only completion of every flow; **every chart ships an accessible table equivalent**; screen-reader smoke test. Avoid custom interaction shortcuts not in the source requirements.

---

## 7. Screen specifications

Each screen lists Purpose · Elements (numbered as in the deck) · Behaviour · States.

### SCR-01 · Login — `/login`

**Purpose:** gate all protected routes behind authentication.
**Elements:** `01` identifier — *Email* (required, validated as email per D1); `02` password (required, masked); `03` **Sign In** button. App title *Expense Tracker*. No header, no footer; vertically centred.
**Behaviour:** submit → validate both non-empty → authenticate → redirect to SCR-02. **`Enter` submits.** Authenticated visitor → redirect to `/`.
**States:** loading disables submit; invalid credentials show a single inline error *"Invalid email or password."* (never which field was wrong); missing session blocks every other route.

### SCR-02 · Home / Expense List — `/`

**Purpose:** display filtered expenses and the matching total.
**Elements:** `01` **Total Spending** summary card (primary dark card, e.g. `$1,248.50`); `02` **From** date; `03` **To** date; `04` **Category** select (default *All*); expense list with columns **Date · Category / Merchant · Amount**; `05` pagination `‹ 1 2 3 ›`.
**Defaults:** `From = today − 7 calendar days`, `To = today`, inclusive (D3). Category = **All**.
**Behaviour:**
- Changing any filter **resets to page 1** and refreshes **list and total together** from one shared query condition.
- **10 items per page.** Sorted **newest first** (`spent_on DESC, id DESC`).
- The merchant is a link → SCR-03, passing the expense ID.
- Filters are reflected in the URL query (`from`, `to`, `category`, `page`) so the view is shareable and back-navigable.
**States:** loading skeleton; **empty results → total `$0.00` and an empty-list message** with the `SearchX` icon; invalid date range (`From > To`) → inline validation, no query fired; page out of bounds → clamp to the last valid page. List stacks cleanly at 320px.

### SCR-03 · Expense Detail / Edit — `/expenses/[id]`

**Purpose:** inspect, edit, or delete an existing expense.
**Elements:** `01` Date; `02` Category select; `03` Merchant; `04` Amount; `05` Notes; `06` **Save Changes**; `07` **Delete Expense** (destructive).
**Behaviour:**
- Entry carries the expense ID; fetch the record **scoped to the session user**. Not found, or owned by another user → not-found state (never "forbidden", per §9).
- Required: date, category, merchant, **positive numeric amount**. Notes optional.
- Save: validate → update → return to SCR-02 with refreshed total and list.
- Delete: **AlertDialog confirmation** → delete → SCR-02. Cancel leaves the record untouched.
**States:** dirty form (unsaved changes); save failure **retains the user's edits**; deletion failure; stale-record conflict → inform and reload; not found.

### SCR-04 · Add Expense — `/expenses/new`

**Purpose:** create one expense manually, or import multiple rows from a receipt.
**Elements:** `01` Date (default **today**); `02` Category select; `03` Merchant; `04` Amount; `05` Notes (optional); `06` **Save Expense**; section divider **OR IMPORT A RECEIPT**; `07` **Take Photo**; `08` **Choose from Album**.
**Behaviour:**
- Manual: date / category / merchant / amount required, **amount > 0** → saves exactly one expense → SCR-02.
- `07` opens the device camera (`<input type="file" accept="image/*" capture="environment">`); `08` opens the photo picker (`accept="image/*"`). Both are browser-support and permission dependent.
- Receipt flow: upload image → server action calls the AI provider → parse into **proposed items, one per line item** (D4) → store in `sessionStorage` (D10) → navigate to SUP-01. **Never auto-save a parsed item.**
**States:** image format check (JPEG/PNG/WebP/HEIC only) and size check (**≤ 10 MB**); camera/album permission denied → message plus manual-entry fallback; upload or AI timeout (**30s**) → retry **or** continue manually; invalid amount blocks save; possible duplicate flagged at review (D4). The on-screen keyboard must not cover `06`.

### SCR-05 · Settings — `/settings`

**Purpose:** configure credentials, categories, and the AI integration.
**Elements:** section **ACCOUNT** → `01` *Change Password ›*; section **CATEGORIES** → `02` *Manage Categories ›*; section **AI CONFIGURATION** → `03` **AI Model** (text, default `gpt-4o-mini`), `04` **API Key** (masked entry), `05` **Verify** (checks `03`/`04` against the provider without saving); `06` **Save Settings**; `07` **Log Out**.
**Behaviour:** `01` → SUP-03, `02` → SUP-02. `05` Verify validates the typed fields and calls the AI provider read-only (no persistence either way); if the key field is left blank, it checks the already-stored key instead. Save validates the configuration: a non-empty model string, and an API key that either is left untouched (keeps the stored value) or is replaced wholesale. **Log Out** clears the session cookie → SCR-01.
**Security:** the stored key is rendered **only** as a masked last-4 (`••••••••1234`); the raw key is never returned to the client, never logged, never placed in an error message, whether saving or verifying. Stored AES-256-GCM encrypted server-side (D5).
**States:** invalid AI config → inline error; verify success/failure → inline confirmation or error, independent of save; save success → confirmation; key never shown unmasked by default.

### SCR-06 · Statistics — `/stats`

**Purpose:** compare six monthly totals and the previous month's category distribution.
**Elements:** `01` **Monthly Spending (6 months)** bar chart — six month labels computed from the current month (in November 2026 this renders `Jun … Nov`; never hardcode the labels); `02` **Last Month by Category** pie chart with legend and percentages (e.g. *Food 45% · Home 30% · Travel 25%*).
**Behaviour:**
- Bar chart: the **current month plus the previous 5** (D7), monthly expense totals, currency-formatted axis.
- Pie chart: the **previous full calendar month**, grouped by category, showing category names and percentages. Percentages are computed from real sums and must total 100% after rounding reconciliation.
- Chart tooltips **plus** an accessible table alternative for both charts.
- Timezone and currency conventions identical to SCR-02.
**States:** no expenses → informative empty-chart message (not a blank box); loading; error; category totals **must reconcile exactly** with the underlying records.

### SUP-01 · Receipt Review — `/receipt/review`

**Purpose:** verify parsed items before committing a batch.
**Elements:** receipt filename caption (e.g. *Receipt: grocery.jpg*); `01…n` proposed item rows — *name · category · amount*, each **editable and removable**; `04` **Total `$14.98` · 3 items** reconciliation line; `05` **Confirm & Save All**; `06` **Cancel**.
**Behaviour:**
- Reached only after parsing. **Never save extracted records directly.**
- Each row edits date, category, merchant/name, amount; validate required fields, valid date, **amount > 0**.
- Rows flagged as possible duplicates carry a visible warning; the user may keep or remove them (D4).
- **Confirm & Save All** writes every row in **one transaction** (D6) → SCR-02. **Cancel** discards the draft → SCR-04.
- No draft in `sessionStorage` → redirect to SCR-04.
**States:** per-row validation errors block save and name the offending row; batch failure rolls back entirely and **preserves all edits**; empty draft after removals disables save.
**Privacy:** the receipt image is in memory only and never persisted (D6).

### SUP-02 · Manage Categories — `/settings/categories`

**Purpose:** add and edit expense category labels.
**Elements:** `01` **New Category Name** input; `02` **Add Category** button; section **EXISTING CATEGORIES** → rows `03…n` each with an **Edit** action (e.g. Food, Home, Travel, Health).
**Behaviour:** create → trim the label, require non-empty and **case-insensitively unique per user** (D8). Edit renames in place; **the category `id` is stable**, so existing expenses keep their link and display the new label. **Delete is not offered** (D8). Ordering is ascending by label, case-insensitive. Back → SCR-05.
**States:** blank name → inline error; duplicate name → inline error naming the conflict; edit validation; save in progress.

### SUP-03 · Change Password — `/settings/password`

**Purpose:** update the account password.
**Elements:** `01` **Current Password**; `02` **New Password**; `03` **Confirm New Password**; `04` **Update Password**.
**Behaviour:** all three required; new must match the confirmation; policy ≥ 10 chars with at least one letter and one digit; new ≠ current (D9). The **server verifies the current password**; all inputs are masked; plaintext is never persisted or logged. On success: increment `token_version` to invalidate **other** sessions, re-issue this device's cookie, show a confirmation, and return to SCR-05.
**States:** wrong current password; weak new password (policy message states the rule); mismatch with the confirmation; network failure.

### Visual state studies (from the handoff package)

- **STATE-01** — Login with invalid credentials (SCR-01).
- **STATE-02** — Home with an empty filtered result and a `$0.00` total (SCR-02).
- **STATE-03** — Destructive delete confirmation dialog (SCR-03).

These three must be reproducible in the running app and are asserted by E2E tests in Phase 5.

---

## 8. Exception handling & validation rules

### 8.1 Validation (zod schemas in `lib/validation/`, enforced server-side)

| Field | Rule | Error copy |
|---|---|---|
| Email | required, valid email format | *"Enter a valid email address."* |
| Password (login) | required, non-empty | *"Enter your password."* |
| Credentials pair | must authenticate | *"Invalid email or password."* |
| `spent_on` | required, ISO `YYYY-MM-DD`, real calendar date | *"Enter a valid date."* |
| `category_id` | required, must exist **and belong to the session user** | *"Select a category."* |
| `merchant` | required, trimmed, 1–160 chars | *"Enter a merchant name."* |
| `amount` | required, numeric, **> 0**, ≤ 2 decimal places, < 1,000,000,000 | *"Enter an amount greater than 0."* |
| `notes` | optional, ≤ 500 chars | *"Notes must be 500 characters or fewer."* |
| Date range | `From ≤ To` | *"The start date must be on or before the end date."* |
| `page` | integer ≥ 1, clamped to the last page | — (clamped silently) |
| Category name | required, trimmed, 1–64 chars, unique per user case-insensitively | *"Enter a category name."* / *"A category with this name already exists."* |
| AI model | required when a key is set, 1–128 chars | *"Enter an AI model name."* |
| AI API key | optional on update (blank = unchanged); when provided, non-empty after trim | *"Enter a valid API key."* |
| New password | ≥ 10 chars, ≥ 1 letter, ≥ 1 digit, ≠ current | *"Use at least 10 characters with a letter and a number."* |
| Confirm password | must equal the new password | *"The passwords do not match."* |
| Receipt image | MIME in JPEG/PNG/WebP/HEIC, ≤ 10 MB | *"Choose a JPEG, PNG, WebP, or HEIC image."* / *"Choose an image under 10 MB."* |

### 8.2 Error classes and handling

| Class | Handling |
|---|---|
| **Field validation** | Inline below the field, `aria-invalid` + `aria-describedby`, submit blocked, **all typed input preserved** |
| **Form-level failure** (save/delete/update rejected) | Non-blocking banner at the top of the form, retry available, **edits preserved**, no navigation |
| **Not found** (expense ID absent or owned by another user) | Dedicated not-found state with a Home link. Returns 404 semantics — **never distinguishes "missing" from "not yours"** |
| **Unauthenticated** | Redirect to `/login`; after login, land on `/` |
| **Stale record conflict** (SCR-03) | Inform, offer reload, never silently overwrite |
| **AI / network timeout** (30s) | *"Receipt scanning timed out. Try again or enter the expense manually."* + both actions offered |
| **AI parse returned nothing usable** | *"No expense items were found on this receipt. Enter the expense manually."* → SCR-04 |
| **AI auth/credit failure** | *"Your AI API key was rejected. Check it in Settings."* — never echo the key or the provider's raw message |
| **Permission denied** (camera/album) | *"Camera access is blocked. Allow it in your browser settings, or enter the expense manually."* |
| **Batch save failure** (SUP-01) | Full transaction rollback, review screen retained with all edits, *"Nothing was saved. Fix the highlighted rows and try again."* |
| **Empty data** | Purposeful empty state with an icon and a next action — not a blank region. SCR-02 shows `$0.00`; SCR-06 shows an empty-chart message |
| **Unexpected server error** | Generic safe copy (*"Something went wrong. Please try again."*), full detail logged **server-side only**, no stack trace or driver message reaching the client |
| **Rate / size limits** | Enforced server-side before any provider call |

**Universal rules:** never surface a raw DB or driver error to the client. Never report success before the server confirms it. Never discard user-entered data because a request failed. Error copy is precise, actionable, and English.

---

## 9. Security requirements

1. **Session:** signed JWT (HS256, `jose`) in an httpOnly + `secure` + `sameSite=lax` cookie, 7-day expiry, claims `{ userId, tokenVersion }`. Every request verifies the signature **and** that `tokenVersion` matches the DB.
2. **Route protection:** `middleware.ts` guards every path except `/login` and static assets — **and** every server action independently re-verifies the session. Middleware alone is not authorization.
3. **Tenant isolation:** every `select` / `update` / `delete` on `expenses` and `categories`, **including aggregates and chart queries**, carries `eq(table.user_id, session.userId)`. `user_id` comes only from the verified session — never from a body, query param, header, or client state. Another user's record responds **not found**.
4. **Passwords:** argon2id (or bcrypt cost ≥ 12), constant-time verify, never logged, never returned, never stored in plaintext.
5. **AI API key:** AES-256-GCM encrypted at rest with `ENCRYPTION_KEY`; decrypted server-side only at call time; exposed to the client only as a masked last-4; never logged, never in an error message, transmitted only to the OpenAI endpoint — including during Verify.
6. **Secrets:** server-side `process.env` only. Nothing secret in source, in a client component, in a committed file, in a log, or in an error. `.env*` gitignored except `.env.example` (names, empty values).
7. **SQL:** drizzle query builder with bound parameters only. No string-interpolated SQL. `sql.raw` forbidden outside migrations.
8. **Receipt data:** images processed in memory, never written to disk or a table. User expense data is sent to no third party other than the configured AI provider, and only during an explicit receipt-parse action initiated by the user.
9. **Destructive actions:** expense delete requires UI confirmation **plus** a server-side ownership re-check.
10. **Headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
11. **No fabricated verification:** every number shown or asserted comes from a real query or computation over real rows. Hardcoding a figure to make a check pass is a build failure.

---

## 10. Project structure

Routes are fixed by §2; internal file placement follows `expense_tracker_design/implementation-guide.md`.

```text
app/
  layout.tsx                        # Inter font, globals.css, <html lang="en">
  globals.css                       # design tokens (from expense_tracker_design/)
  (auth)/login/page.tsx             # SCR-01
  (auth)/login/actions.ts
  (app)/layout.tsx                  # authenticated shell: header + BottomNav (once)
  (app)/page.tsx                    # SCR-02
  (app)/actions.ts
  (app)/expenses/new/page.tsx       # SCR-04
  (app)/expenses/new/actions.ts     # create + parse-receipt
  (app)/expenses/[id]/page.tsx      # SCR-03
  (app)/expenses/[id]/actions.ts    # update + delete
  (app)/stats/page.tsx              # SCR-06
  (app)/settings/page.tsx           # SCR-05
  (app)/settings/actions.ts         # AI config + verify + logout
  (app)/settings/categories/page.tsx    # SUP-02
  (app)/settings/categories/actions.ts
  (app)/settings/password/page.tsx      # SUP-03
  (app)/settings/password/actions.ts
  (app)/receipt/review/page.tsx     # SUP-01
  (app)/receipt/review/actions.ts   # atomic batch save
components/
  app/bottom-nav.tsx  app/page-header.tsx  app/empty-state.tsx
  expenses/expense-form.tsx  expenses/expense-row.tsx
  expenses/spending-summary.tsx  expenses/expense-filters.tsx  expenses/pagination.tsx
  receipts/receipt-row.tsx  receipts/receipt-picker.tsx
  settings/settings-row.tsx  settings/category-row.tsx
  charts/monthly-spending.tsx  charts/category-breakdown.tsx  charts/chart-table.tsx
  ui/                               # shadcn/ui primitives
db/
  schema.ts  index.ts  seed.ts  migrations/
lib/
  auth/session.ts  auth/password.ts
  crypto/api-key.ts
  money.ts  dates.ts
  queries/expenses.ts  queries/categories.ts  queries/stats.ts  queries/settings.ts
  validation/expense.ts  validation/auth.ts  validation/category.ts  validation/settings.ts
  ai/parse-receipt.ts  ai/verify-ai-settings.ts
  logging/error-log.ts                # daily logs/YYYY-MM-DD.log, no secrets
instrumentation.ts                     # onRequestError → lib/logging/error-log.ts
middleware.ts
tests/e2e/
drizzle.config.ts
next.config.ts                        # output: 'standalone' (required by §12)
Dockerfile                            # multi-stage production image (§12)
.dockerignore
docker-compose.yml                    # app + migrate + mysql (§12)
docker/init.sql                       # creates both databases on first boot
logs/                                 # gitignored; mounted as a volume in docker-compose (§12)
```

Build **one reusable authenticated shell**; never duplicate navigation per page. Prefer semantic shared component variants over per-page hardcoded classes.

---

## 11. Acceptance criteria

From deck slide 15 (State Matrix) plus the design handoff's validation checklist. These are the must-pass behaviours; `FLOW.md` turns them into executable gates.

**Auth** — no session → Login · login failure → inline message · logout → Login · authenticated visit to `/login` → Home.
**Home** — `From > To` → validation, no query · empty results → `$0.00` and an empty list · page bounds respected · filter change refreshes total **and** list together · 10 per page, newest first.
**Detail** — missing or foreign ID → not found · save failure retains edits · delete requires confirmation.
**Add** — invalid amount blocks save · AI failure offers retry **or** manual entry · parsed items always reviewed before any write.
**Settings** — invalid AI config → inline error · API key never shown unmasked by default.
**Statistics** — no data → informative empty chart · **category totals reconcile exactly with the underlying records**.
**Receipt Review** — nothing auto-saves · batch is atomic · edits survive a failure.
**Categories** — blank and duplicate names rejected · rename preserves the category ID and existing expense links.
**Password** — wrong current password rejected · policy enforced · other sessions invalidated on success.

**Cross-cutting**

- All 9 Screen IDs present, with matching IDs and core behaviour.
- English UI text and the Inter font throughout.
- 3 brand roles + neutrals + limited status colours; consistent icons and buttons across pages.
- Primary CTA, plus error / empty / loading / confirmation / focus states, plus an accessible chart table, on every applicable screen.
- No `open-decisions.md` item silently treated as approved — every one is resolved in §4 and labelled.
- Production typography (16px body) rather than the mockups' compact preview type.
- No horizontal overflow at 320 / 390 / 430px; keyboard-only completion of every flow; zero serious or critical axe violations.
- Money is integer minor units at every layer; no float arithmetic on money anywhere.
- Every user-data query is `user_id`-scoped; the cross-tenant isolation test passes.

---

## 12. Deployment

**Target: a single host running Docker.** `docker compose up -d --build` brings up the application and its MySQL together. There is no second deployment path — no bare-metal `npm start` runbook, no platform-specific config.

### Image

- **Multi-stage** `Dockerfile` on `node:22-alpine`: `deps` (`npm ci` against the committed lockfile) → `build` (`npm run build`) → `runtime`.
- `next.config.ts` sets **`output: 'standalone'`**, so the runtime stage copies `.next/standalone`, `.next/static`, and `public/` and runs `node server.js` with **no `node_modules` install and no build toolchain** in the final image.
- Runs as a **non-root** user (`nextjs`, uid 1001).
- **No secret is baked into the image.** Every value in §3 arrives at runtime from the environment. No `ARG` or `ENV` for a secret, no `.env` copied in — `.dockerignore` excludes `.env*` except `.env.example`.
- `.dockerignore` also excludes `node_modules`, `.next`, `.git`, `tests/e2e/`, coverage output, and the read-only design inputs (`expense_tracker_design/`, the `.pptx`, the PDF), none of which belong in a production image.

### Compose services

| Service | Role |
|---|---|
| `app` | the standalone Next.js server on port 3000; `depends_on` mysql `service_healthy`; has its own HTTP healthcheck against `/login` |
| `migrate` | **one-shot** `npm run db:migrate && npm run db:seed`, under the `tools` profile so it never starts with `up` |
| `mysql` | MySQL 8.0, `utf8mb4_unicode_ci`, named volume `mysql-data`, port published to `127.0.0.1` only |

`DATABASE_URL` is overridden for `app` and `migrate` to reach the database as host `mysql` inside the compose network, since the value in `.env` points at `127.0.0.1` for local development.

### Operational rules

- **Migrations never run on container start.** They are the `migrate` service, invoked deliberately (`docker compose run --rm migrate`). Running them from the app's entrypoint would let two replicas race to mutate the schema.
- **Server errors are logged locally** via `instrumentation.ts`'s `onRequestError` → `lib/logging/error-log.ts`, one JSON line per error in `logs/YYYY-MM-DD.log` (timestamp, message, stack, request path/method — never headers, cookies, or bodies, which can carry the session token or a user's AI API key). `docker-compose.yml` mounts `./logs:/app/logs` so the files are readable from the host, and pins the `app` service to `user: "1001:1001"` (matching the Dockerfile's `nextjs` user) so that UID is fixed across rebuilds; the host directory must be `chown`'d to that same UID once before the first `docker compose up` (README's Deployment section), or the bind mount shadows the image's own permissions and logging silently fails. This is local file logging only, not the log shipping excluded below.
- Secrets are supplied by `.env` (gitignored) or the host's own secret mechanism. `.env.example` carries names only.
- MySQL's port is bound to `127.0.0.1`, not `0.0.0.0` — the database is not reachable from outside the host.
- **Out of scope for v1.0:** registry publishing, an orchestrator, TLS termination, multi-replica scaling, and log shipping. TLS and the public hostname are the operator's reverse proxy, not this repo's concern.
