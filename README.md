# Expense Tracker

A mobile-web expense tracker: record spending, scan receipts, review trends. Next.js (App Router) + TypeScript + MySQL. See `SPEC.md` for the full product spec and `FLOW.md` for how this was built.

## Local development

Requires Node 22+ and Docker (for MySQL).

```bash
cp .env.example .env        # fill in the values below
docker compose up -d mysql  # database only
npm install
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string for the app, e.g. `mysql://root:<password>@127.0.0.1:3307/expense_tracker` |
| `TEST_DATABASE_URL` | Separate database used by the Playwright E2E suite, e.g. `...expense_tracker_test` |
| `SESSION_SECRET` | ≥32 bytes, signs the session JWT (HS256) |
| `ENCRYPTION_KEY` | 32-byte key, base64-encoded, encrypts the stored AI API key (AES-256-GCM) |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | Credentials `db:seed` creates for local sign-in |
| `MYSQL_ROOT_PASSWORD` | Local/Docker MySQL root password only — the app itself never uses it |
| `OPENAI_BASE_URL` | Optional. Points the `openai` SDK at an OpenAI-compatible endpoint (e.g. OpenRouter) instead of OpenAI's own. Blank/unset = OpenAI's default. |

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve a production build
npm run typecheck    # tsc --noEmit, strict
npm run lint         # eslint, zero warnings
npm run test         # vitest unit/integration
npm run test:e2e     # playwright, against TEST_DATABASE_URL
npm run verify       # typecheck && lint && test
npm run db:generate  # drizzle-kit generate (new migration from schema changes)
npm run db:migrate   # drizzle-kit migrate
npm run db:seed      # seed the dev user + default categories
```

### Running the gates

Each build phase in `FLOW.md` has a Programmatic Gate — an exact sequence of commands that must all exit 0. The full project gate (Phase 5's) is the most complete and subsumes the earlier ones:

```bash
npm run typecheck && npm run lint && npm run test
npm run db:migrate && npm run db:seed
npx playwright install --with-deps
npm run test:e2e
npm run build
```

The E2E suite expects a migrated and seeded `TEST_DATABASE_URL`, and runs at the 390×844 mobile viewport.

## Deployment (Docker)

A single host running Docker. No other deployment path is supported.

Before the first `docker compose up` on a host, create the log directory and
own it by the `app` container's fixed UID (`docker-compose.yml`'s `user:
"1001:1001"`) — otherwise the bind mount shadows the image's own permissions
and `logs/YYYY-MM-DD.log` silently fails to write:

```bash
mkdir -p logs && chown 1001:1001 logs
```

First install:

```bash
docker compose up -d --build        # app + mysql
docker compose run --rm migrate     # one-shot: migrate then seed
```

Upgrading an existing host — **the order matters, and `migrate` must be rebuilt**:

```bash
git pull
docker compose build migrate        # REQUIRED: see the warning below
docker compose run --rm migrate     # apply new migrations first
docker compose up -d --build app    # then restart the app on the new code
```

> **`docker compose run` does not rebuild the image.** It reuses whatever
> `migrate` image already exists, so after a `git pull` it runs the *old*
> source — drizzle-kit then sees only the migrations baked into that stale
> image, finds nothing new, and prints `migrations applied successfully`
> while applying nothing at all. A silent no-op, not an error. Always
> `docker compose build migrate` first.
>
> Migrate **before** restarting the app, not after: migrations here are
> additive, so the running old code is unaffected by a new column, whereas
> new code against an un-migrated schema fails every query
> (`Unknown column ... in 'field list'`) until the migration lands.

Verify the migration actually applied, rather than trusting the message:

```bash
docker compose exec mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
  -e "SELECT id FROM expense_tracker.__drizzle_migrations ORDER BY id;"
```

The app serves on `http://localhost:3000`. MySQL's port is bound to `127.0.0.1` only — it is not reachable from outside the host.

```bash
docker compose down                 # stop (the mysql-data volume survives)
```

### How it's built

- `Dockerfile` is multi-stage (`deps` → `build` → `runtime`) on `node:22-alpine`. The `runtime` stage ships only `.next/standalone`, `.next/static`, and `public/` — no `node_modules` install and no build toolchain — and runs as a non-root user.
- No secret is ever baked into the image: every value above arrives at runtime from the environment (`docker-compose.yml`'s `app`/`migrate` services, backed by your `.env`). `.dockerignore` excludes `.env*` (except `.env.example`).
- Migrations never run on container start — they're the one-shot `migrate` service (under the `tools` profile, so `docker compose up` never triggers it on its own), invoked deliberately so two replicas can't race to mutate the schema.
