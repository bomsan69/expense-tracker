import { expect, test } from "@playwright/test";
import { SEED_EMAIL, login } from "./helpers";

test.describe("auth", () => {
  test("unauthenticated access to protected routes redirects to /login", async ({
    page,
  }) => {
    for (const path of ["/", "/stats", "/settings", "/expenses/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/login");
    }
  });

  test("invalid credentials show the inline error (STATE-01)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/^Email/).fill(SEED_EMAIL);
    await page.getByLabel(/^Password/).fill("wrong-password-xyz");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("successful login lands on Home (SCR-02)", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  });

  test("an authenticated visit to /login redirects to /", async ({ page }) => {
    await login(page);
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("Log Out returns to Login and re-protects routes", async ({ page }) => {
    await login(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Log Out" }).click();
    await expect(page).toHaveURL("/login");
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});
