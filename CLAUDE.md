# CLAUDE.md — Claude Code additions

**Project:** Expense Tracker — mobile web app (390×844 reference viewport)
**Stack:** Next.js (App Router) · TypeScript · MySQL · drizzle-orm

**Read `AGENTS.md` first. It is the canon for every agent on this repo** — document authority, the autonomous-operation contract, the file-change protocol, security and isolation, code style, and reporting. This file does **not** repeat those rules; it adds the three things Claude Code must do on top of them.

Single source for each kind of question — go to one place, not four:

| Question | Canon |
|---|---|
| What to build, data model, resolved decisions, validation, error copy | `SPEC.md` |
| Build order, deliverables, the gate that approves each phase | `FLOW.md` |
| Security, tenant isolation, secrets | `SPEC.md §9` |
| How it looks | `expense_tracker_design/` (read-only) |
| How to behave as an agent here | `AGENTS.md` |

---

## 1. Think before coding

Unconditional coding is prohibited. Before each unit of implementation work, do this inline — in your thinking or a 3–6 line note, never a document.

**State assumptions.** Name any business rule you are unsure of. Check `SPEC.md §4 Resolved Decisions` first — most answers are already fixed there. If a rule is genuinely absent, pick the simplest behaviour consistent with the deck, write the assumption into `BUILD_LOG.md`, and proceed. Never leave an assumption only in your head.

**Analyse trade-offs.** When more than one implementation is plausible, give one recommendation plus the runner-up and the reason, in a sentence or two each. Do not silently pick, and do not survey five options you will not build.

**Self-check the design** before writing a feature:

- [ ] Right layer? (schema → `db/`, business rule → `lib/`, orchestration → server action, presentation → component)
- [ ] Money as integer minor units, with no float arithmetic anywhere?
- [ ] Every DB read and write scoped to the session user's `user_id`? (`SPEC.md §9.3`)
- [ ] Validated by a zod schema shared client/server, with the **server** enforcing?
- [ ] Matches the Screen ID in `SPEC.md §7` — same ID, same fields, same states?
- [ ] States covered per `SPEC.md §6.7`: default, loading, empty, invalid/error, success?
- [ ] Does a failed mutation preserve the user's typed input?

**Don't hide confusion.** If something is genuinely unclear, name it in the turn summary even while proceeding under an assumption. Silence about doubt is worse than a documented guess.

---

## 2. Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No feature `SPEC.md` does not list. No "while I was here" additions.
- **No abstraction for single-use code.** Extract on the *second* real caller, never in anticipation of one.
- No configurability, plugin seams, strategy interfaces, generic repositories, or env-var switches that were not requested. The AI provider is one provider (`SPEC.md §4 D5`) — no provider abstraction layer.
- No error handling for impossible states. Validate at the boundary; trust your own types inside it.
- No caching, memoisation, retry/backoff, queueing, or rate-limiting unless `SPEC.md` names it.
- **After a feature works, read it back and delete.** If 200 lines could be 50, rewrite it to 50 before running the gate. Ask: "would a senior engineer call this overcomplicated?" If yes, simplify now.

---

## 3. Goal-driven execution

Every task becomes a verifiable goal before it becomes code.

| Vague task | Verifiable goal |
|---|---|
| "Add validation" | Write failing tests for each invalid input in `SPEC.md §8.1`, then make them pass |
| "Fix the bug" | Write a test that reproduces it, watch it fail, then make it pass |
| "Build the stats query" | Seed known rows, assert the aggregate equals the hand-computed total |
| "Refactor X" | Gate green before, gate green after, no behaviour diff |

For multi-step work, state the plan as `<step> → verify: <exact command or assertion>` before starting.

- **Business logic is test-first.** Money math, date-range math, validation, and stats aggregation get a failing test before an implementation. UI composition does not need test-first, but does need the `SPEC.md §6.7` states.
- `npm run verify` is the baseline. Run it before declaring any unit of work done.

---

## 4. Quick command reference

```bash
docker compose up -d mysql          # local development: database only
npm run dev                         # dev server
npm run build            # production build (must be clean)
npm run typecheck        # tsc --noEmit, strict
npm run lint             # eslint, zero warnings
npm run test             # vitest unit/integration
npm run test:e2e         # playwright
npm run verify           # typecheck && lint && test
npm run db:generate      # drizzle-kit generate
npm run db:migrate       # drizzle-kit migrate
npm run db:seed          # seed dev user + default categories
```

Deployment (`SPEC.md §12`):

```bash
docker compose up -d --build        # app + mysql in containers
docker compose run --rm migrate     # one-shot: migrate then seed
docker compose down                 # stop (named volume survives)
```

Definition of done for the whole project: see `FLOW.md § Project definition of done`.
