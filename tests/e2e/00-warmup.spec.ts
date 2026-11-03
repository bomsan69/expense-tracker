import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Next's dev server (Turbopack) compiles each route on first visit and
// reloads the page once that compile finishes — which can land mid-click in
// a later spec and silently swallow the interaction. Visiting every route
// once here, before any other spec runs (00- sorts first), forces that
// compile+reload to happen here instead.
const ROUTES = [
  "/login",
  "/",
  "/expenses/new",
  "/stats",
  "/settings",
  "/settings/categories",
  "/settings/password",
  "/receipt/review",
  // Any id compiles the [id] route template itself; the record need not exist.
  "/expenses/1",
];

test("warm up every route's compilation before the real specs run", async ({
  page,
}) => {
  await login(page);
  for (const route of ROUTES) {
    await page.goto(route);
  }
  await expect(page).toHaveURL(/.*/);
});
