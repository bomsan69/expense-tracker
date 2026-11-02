# AGENTS.md — Shared Agent Instructions

For **all** coding agents working in this repository: Claude Code, Codex / Codex CLI, Gemini CLI, Cursor, Aider, Copilot Workspace, and any other autonomous or semi-autonomous assistant.

**This file is the canon for agent behaviour.** `CLAUDE.md` adds three Claude-Code-specific sections on top of it (think-before-coding, simplicity, goal-driven execution) and deliberately does not repeat anything here.

**Project:** Expense Tracker — mobile web app · Next.js (App Router) · TypeScript · MySQL · drizzle-orm
**Read before writing any code:** `SPEC.md` → `FLOW.md` → `expense_tracker_design/design-system.md`

---

## 1. Document authority

Resolve every question in this order. Stop at the first document that answers it.

1. **`SPEC.md`** — functional requirements, data model, resolved decisions, exception handling. The single source of truth for *what* to build.
2. **`FLOW.md`** — phase order, deliverables, and the Programmatic Gate that approves each phase.
3. **`expense_tracker_design/`** — `design-system.md`, `design-tokens.json`, `globals.css`, `component-specs.md`, `screen-design-map.md`, `implementation-guide.md`, `mockups/*.png`, `ui-mockups.pdf`. The source of truth for *how it looks*.
4. **`expense_tracker_uiux_spec_v1.pptx`** — the original 16-slide deck. Consult when 1–3 are silent or appear to disagree.
5. **The existing codebase** — for style, naming, and local convention.

`expense_tracker_design/` and the `.pptx` are **read-only**. Never edit, move, rename, regenerate, or "clean up" either.

If `SPEC.md` and the design folder genuinely conflict, `SPEC.md` governs behaviour and the design folder governs appearance. Note the conflict in `BUILD_LOG.md`.

---

## 2. Autonomous operation — no human approval gates

Work continuously. Do not pause for permission between steps, and do not end a session with an unexecuted plan.

- Each phase in `FLOW.md` ends in a **Programmatic Gate**: a fixed list of commands. All exit 0 → advance. Any non-zero → fix, re-run the **entire** gate, repeat.
- **Do not weaken a gate to pass it.** No deleting or skipping tests, no `--passWithNoTests`, no blanket `eslint-disable`, no `@ts-ignore` / `@ts-expect-error` to silence a real type error, no relaxing `tsconfig` strict flags, no lowering thresholds. Doing so is a build failure.
- Phases run in `FLOW.md` order. Never begin a phase while an earlier gate is red.
- **Three-strike rule:** the same command failing 3 times with an unchanged error means stop. Record the command, the full output, and your two best hypotheses in `BUILD_LOG.md` and hand back to the human.
- Legitimate blockers are only: a secret that cannot be invented, or a contradiction in `SPEC.md` that no reading resolves. Everything else → decide, document the assumption, continue.
- **`BUILD_LOG.md` is mandatory.** Append at every phase boundary: phase, gate commands, result, assumptions taken, deviations from `SPEC.md`. It is how the next agent — possibly a different model — picks up your work.

---

## 3. Autonomous file-change protocol

**Before changing a file**

1. **Read it in full.** Never overwrite, patch blind, or delete a file you have not read. This applies even to files you believe you created.
2. Check whether the change belongs in a file that already exists. Prefer editing over creating.
3. Confirm the change traces to a `SPEC.md` requirement or a red gate. If it traces to neither, do not make it.

**While changing it**

4. Make the **smallest edit that works**. Do not reformat, re-indent, re-order imports, rewrite comments, or rename symbols outside the lines you must change.
5. **Match surrounding style exactly.** Read two neighbouring files first: naming case, import grouping, quotes, semicolons, arrow vs. declaration components, error-return shape, test layout. Local convention beats your defaults and beats any style you prefer.
6. Keep one concern per change. Do not mix a refactor into a feature edit.

**After changing it**

7. **Remove the orphans your change created** — now-unused imports, variables, functions, types, files.
8. **Leave pre-existing dead code alone.** Note it in `BUILD_LOG.md`; do not delete it without an explicit request.
9. Run `npm run verify` (typecheck + lint + test). A change is not finished until it is green.

**Hard prohibitions**

- No `rm -rf`, no `git reset --hard`, no `git clean -fd`, no force-push, no history rewrite.
- No dropping, truncating, or re-creating a database other than the disposable test database.
- No destructive or data-losing migration during the build; migrations are forward-only and additive.
- No edits to lockfiles by hand — change dependencies through the package manager.
- No new dependency outside `SPEC.md §3` without recording the justification in `BUILD_LOG.md`.
- No commits unless the human asked for one. If you commit, never commit `.env*` (except `.env.example`), `node_modules/`, build output, receipt images, or database dumps.

---

## 4. Security & isolation rules

**`SPEC.md §9` is the canon for every security rule** — session handling, route protection, tenant isolation, password hashing, AI key encryption, secrets, SQL, receipt handling, and response headers. Read it; this section does not restate it. What follows is only the agent-behaviour layer on top.

**Never invent data.** Do not hardcode, estimate, or back-fill any figure to make a result look correct. Every total, count, percentage, and chart value is derived from a real query or a real computation over real rows. Test fixtures are created by the test and read back through the application's own code path. **A fabricated verification is worse than an admitted failure** — it produces a build that reports success and is wrong. This is the single worst failure mode available to you here.

**Apply `SPEC.md §9` at every step, not once.** Run it as a checklist on every data-access and file-modification change, including "internal" helpers, aggregate and chart queries, and anything you wrote yourself earlier in the session.

**Keep the isolation proof green.** The cross-tenant test from `FLOW.md` Phase 2 must stay passing in every later phase, not just the one that introduced it.

---

## 5. Code style conformance

- **TypeScript strict.** No `any`. Use `unknown` plus a narrowing guard at boundaries. No non-null `!` assertion where a guard will do.
- **Validation:** one zod schema per input shape in `lib/validation/`, imported by both the form and the server action. The **server** is the enforcing side; client validation is a convenience only.
- **Money:** integer minor units (cents) end to end — DB, domain, API, tests. Format for display only, at the view edge, via the shared helper. Never `parseFloat` into arithmetic, never `toFixed` for math.
- **Dates:** ISO `YYYY-MM-DD` internally and in the DB; localised display only at the view edge, via the shared helper.
- **Server-first.** React Server Components by default. `'use client'` only for a component that needs state, an effect, or an event handler — and then at the smallest possible leaf.
- **Mutations are server actions** in `app/**/actions.ts`, returning a discriminated result (`{ ok: true, data } | { ok: false, error }`). No `fetch` to internal API routes from client components.
- **Naming:** files `kebab-case.ts(x)`; components `PascalCase`; functions and variables `camelCase`; DB tables/columns `snake_case`; types/interfaces `PascalCase`, no `I` prefix.
- **Styling:** Tailwind utilities with the semantic tokens from `globals.css` (`bg-accent`, `text-muted-foreground`, `border-border`). No raw hex in a component, no inline `style` for anything a token covers, no CSS-in-JS, no second UI library. shadcn/ui primitives plus `lucide-react` icons, one icon library only.
- **Accessibility is part of the style rules, not an extra:** every input has a `<label>`; invalid fields carry `aria-invalid` and `aria-describedby` pointing at the error element; icon-only buttons have an accessible name; decorative icons are `aria-hidden="true"`; focus is visibly indicated; touch targets ≥ 44×44 CSS px; every chart ships an accessible table equivalent.
- **Comments** explain *why*, never *what*. No commented-out code, no `TODO` without a `SPEC.md` reference, no banner/decoration comments. Match the surrounding comment density — if neighbouring files are uncommented, do not add commentary.
- **Tests** live in `*.test.ts(x)` beside the unit under test, or in `tests/e2e/` for Playwright. Assert behaviour, not implementation. A snapshot is never a substitute for a real assertion.

---

## 6. Reporting

End every session with:

1. What you completed, by `FLOW.md` phase and `SPEC.md` Screen ID.
2. The gate commands you ran and their actual results — paste failures verbatim; never claim green for a gate you did not run.
3. Every assumption you took and every `SPEC.md` deviation (also appended to `BUILD_LOG.md`).
4. What remains, and for anything blocked, the precise blocker.

Faithful reporting over optimistic reporting, always. If part of the scope was blocked, complete everything else in full and state plainly what you left out and why.
